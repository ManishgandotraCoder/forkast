import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Order, Trade } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { cryptoList } from '../../constants/crypto';

@Injectable()
export class OrderbookService {
    protected readonly logger = new Logger(this.constructor.name);

    constructor(protected readonly prisma: PrismaService) { }

    protected validateSymbol(symbol: string): void {
        if (!cryptoList.some(c => c.symbol === symbol)) {
            throw new BadRequestException(`Symbol ${symbol} not supported`);
        }
    }

    protected async createOrder(
        tx: any,
        userId: number,
        type: 'buy' | 'sell',
        symbol: string,
        price: number,
        quantity: number,
        market: boolean,
    ): Promise<Order> {
        return tx.order.create({
            data: {
                userId,
                type,
                symbol,
                price,
                quantity,
                market,
                status: 'open',
                filledQuantity: 0,
            },
        });
    }

    protected async recordTrade(
        tx: any,
        buyOrderId: number | null,
        sellOrderId: number | null,
        price: number,
        quantity: number,
        buyerUserId: number | null,
        sellerUserId: number | null,
    ): Promise<Trade> {
        return tx.trade.create({
            data: {
                buyOrderId,
                sellOrderId,
                price,
                quantity,
                buyerUserId,
                sellerUserId,
            },
        });
    }

    protected async updateOrderStatus(
        tx: any,
        orderId: number,
        status: string,
        filledQuantity?: number,
    ): Promise<Order> {
        const updateData: any = { status };
        if (filledQuantity !== undefined) {
            updateData.filledQuantity = filledQuantity;
        }
        return tx.order.update({
            where: { id: orderId },
            data: updateData,
        });
    }

    protected async transferBalance(
        tx: any,
        fromUserId: number,
        toUserId: number,
        symbol: string,
        amount: number,
    ): Promise<void> {
        // Decrement from user
        await tx.balance.update({
            where: { userId_symbol: { userId: fromUserId, symbol } },
            data: { amount: { decrement: amount } },
        });

        // Increment to user
        await tx.balance.upsert({
            where: { userId_symbol: { userId: toUserId, symbol } },
            update: { amount: { increment: amount } },
            create: { userId: toUserId, symbol, amount },
        });
    }

    protected async checkBalance(
        tx: any,
        userId: number,
        symbol: string,
        requiredAmount: number,
    ): Promise<void> {
        const balance = await tx.balance.findUnique({
            where: { userId_symbol: { userId, symbol } },
        });

        if (!balance || balance.amount < requiredAmount) {
            throw new BadRequestException(
                `Insufficient balance for ${symbol}. Available: ${balance?.amount ?? 0}, Required: ${requiredAmount}`
            );
        }
    }

    async placeOrder(
        userId: number,
        type: 'buy' | 'sell',
        symbol: string,
        price: number,
        quantity: number,
        market: boolean,
    ): Promise<Order> {
        try {
            this.validateSymbol(symbol);

            return await this.prisma.$transaction(async (tx) => {
                const order = await this.createOrder(tx, userId, type, symbol, price, quantity, market);

                this.logger.log(
                    `${type.toUpperCase()} order placed: id=${order.id} userId=${userId} ${symbol} price=${price} qty=${quantity} market=${market}`
                );

                if (market) {
                    return await this.handleMarketOrder(tx, order, userId, symbol, quantity, price);
                } else {
                    return await this.handleLimitOrder(tx, order, userId, symbol, quantity, price, type);
                }
            });
        } catch (error) {
            this.logger.error(
                `Failed to place ${type.toUpperCase()}: userId=${userId} symbol=${symbol} price=${price} qty=${quantity} market=${market}`,
                error instanceof Error ? error.stack : String(error)
            );
            throw error;
        }
    }

    private async handleMarketOrder(
        tx: any,
        order: Order,
        userId: number,
        symbol: string,
        quantity: number,
        price: number,
    ): Promise<Order> {
        if (order.type === 'sell') {
            await this.checkBalance(tx, userId, symbol, quantity);
            await this.transferBalance(tx, userId, 0, symbol, quantity);
            await this.recordTrade(tx, null, order.id, price, quantity, 0, userId);
        } else {
            const mmBalance = await tx.balance.findUnique({
                where: { userId_symbol: { userId: 0, symbol } },
            });

            if (!mmBalance || mmBalance.amount < quantity) {
                throw new BadRequestException(
                    `Insufficient market inventory for ${symbol}. Available: ${mmBalance?.amount ?? 0}, Required: ${quantity}`
                );
            }

            await this.transferBalance(tx, 0, userId, symbol, quantity);
            await this.recordTrade(tx, order.id, null, price, quantity, userId, 0);
        }

        return await this.updateOrderStatus(tx, order.id, 'filled', quantity);
    }

    private async handleLimitOrder(
        tx: any,
        order: Order,
        userId: number,
        symbol: string,
        quantity: number,
        price: number,
        type: 'buy' | 'sell',
    ): Promise<Order> {
        const oppositeType = type === 'buy' ? 'sell' : 'buy';
        const priceCondition = type === 'buy' ? { lte: price } : { gte: price };
        const orderBy = type === 'buy'
            ? [{ price: 'asc' }, { createdAt: 'asc' }]
            : [{ price: 'desc' }, { createdAt: 'asc' }];

        const matchingOrders = await tx.order.findMany({
            where: {
                type: oppositeType,  //buy
                symbol,// btc
                status: 'open',
                price: priceCondition, //price vlaue
            },
            orderBy,
        });

        let remaining = quantity;
        let totalFilled = 0;

        for (const matchingOrder of matchingOrders) {
            if (remaining <= 0) break;

            const availableQuantity = matchingOrder.quantity - matchingOrder.filledQuantity;
            if (availableQuantity <= 0) continue;

            const tradeQuantity = Math.min(remaining, availableQuantity);
            const tradePrice = matchingOrder.price;

            // Transfer balance
            if (type === 'sell') {
                await this.transferBalance(tx, userId, matchingOrder.userId, symbol, tradeQuantity);
            } else {
                await this.transferBalance(tx, matchingOrder.userId, userId, symbol, tradeQuantity);
            }

            // Record trade
            await this.recordTrade(
                tx,
                type === 'buy' ? order.id : matchingOrder.id,
                type === 'sell' ? order.id : matchingOrder.id,
                tradePrice,
                tradeQuantity,
                type === 'buy' ? userId : matchingOrder.userId,
                type === 'sell' ? userId : matchingOrder.userId,
            );

            // Update filled quantities
            await tx.order.update({
                where: { id: order.id },
                data: { filledQuantity: { increment: tradeQuantity } },
            });

            await tx.order.update({
                where: { id: matchingOrder.id },
                data: { filledQuantity: { increment: tradeQuantity } },
            });

            // Close matching order if fully filled
            if (matchingOrder.filledQuantity + tradeQuantity >= matchingOrder.quantity) {
                await this.updateOrderStatus(tx, matchingOrder.id, 'filled');
            }

            remaining -= tradeQuantity;
            totalFilled += tradeQuantity;
        }

        const finalStatus = totalFilled >= quantity ? 'filled' : 'open';
        return await this.updateOrderStatus(tx, order.id, finalStatus);
    }

    async getOrderbook(symbol?: string, page: number = 1, limit: number = 50): Promise<{
        buys: Order[];
        sells: Order[];
        pagination: {
            page: number;
            limit: number;
            totalBuys: number;
            totalSells: number;
            totalPages: number;
        }
    }> {
        const skip = (page - 1) * limit;

        const [buys, sells, totalBuys, totalSells] = await Promise.all([
            this.prisma.order.findMany({
                where: { type: 'buy', status: 'open', ...(symbol && { symbol }) },
                include: { user: true },
                orderBy: { price: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.order.findMany({
                where: { type: 'sell', status: 'open', ...(symbol && { symbol }) },
                include: { user: true },
                orderBy: { price: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.order.count({
                where: { type: 'buy', status: 'open', ...(symbol && { symbol }) },
            }),
            this.prisma.order.count({
                where: { type: 'sell', status: 'open', ...(symbol && { symbol }) },
            }),
        ]);

        const totalPages = Math.ceil(Math.max(totalBuys, totalSells) / limit);

        return {
            buys,
            sells,
            pagination: {
                page,
                limit,
                totalBuys,
                totalSells,
                totalPages,
            }
        };
    }

    async getTradeHistory(userId?: number, page: number = 1, limit: number = 50): Promise<{
        trades: Trade[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        }
    }> {
        const skip = (page - 1) * limit;
        const where = userId ? {
            OR: [
                { buyOrder: { userId } },
                { sellOrder: { userId } }
            ]
        } : {};

        const [trades, total] = await Promise.all([
            this.prisma.trade.findMany({
                where,
                orderBy: { executedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.trade.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            trades,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            }
        };
    }

    async getMyOrders(userId: number, query?: any): Promise<{
        orders: Order[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        }
    }> {
        const where: any = { userId };
        if (query?.symbol) where.symbol = query.symbol;
        if (query?.side) where.type = query.side.toLowerCase();
        if (query?.status) where.status = query.status;

        const page = query?.page ? parseInt(query.page) : 1;
        const limit = query?.limit ? parseInt(query.limit) : 50;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.order.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            }
        };
    }
    async cancelOrder(userId: number, orderId: string): Promise<Order> {
        const order = await this.prisma.order.findUnique({
            where: { id: parseInt(orderId), userId },
        });

        if (!order) {
            throw new BadRequestException(`Order with ID ${orderId} not found`);
        }
        return this.prisma.order.update({
            where: { id: parseInt(orderId) },
            data: { status: 'cancelled' },
        });
    }

}
