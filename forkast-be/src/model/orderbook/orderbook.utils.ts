import { BadRequestException } from "@nestjs/common";
import { cryptoList } from "src/constants/crypto";
import { Order, Trade } from '@prisma/client';

export const validateSymbol = (symbol: string): void => {
    if (!cryptoList.some(c => c.symbol === symbol)) {
        throw new BadRequestException(`Symbol ${symbol} not supported`);
    }
}

export const getCurrentMarketPrice = (symbol: string): number => {
    const crypto = cryptoList.find(c => c.symbol === symbol);
    if (!crypto) {
        throw new BadRequestException(`Symbol ${symbol} not supported`);
    }
    return crypto.price;
}

export const createOrder = async (
    tx: any,
    userId: number,
    type: 'buy' | 'sell',
    symbol: string,
    price: number,
    quantity: number,
    market: boolean,
): Promise<Order> => {
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

export const recordTrade = async (
    tx: any,
    buyOrderId: number | null,
    sellOrderId: number | null,
    price: number,
    quantity: number,
    buyerUserId: number | null,
    sellerUserId: number | null,
): Promise<Trade> => {
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

export const updateOrderStatus = async (
    tx: any,
    orderId: number,
    status: string,
    filledQuantity?: number,
): Promise<Order> => {
    const updateData: any = { status };
    if (filledQuantity !== undefined) {
        updateData.filledQuantity = filledQuantity;
    }
    return tx.order.update({
        where: { id: orderId },
        data: updateData,
    });
}

export const transferBalance = async (
    tx: any,
    fromUserId: number,
    toUserId: number,
    symbol: string,
    amount: number,
    costPrice: number,
): Promise<void> => {
    // Decrement from user
    await tx.balance.update({
        where: { userId_symbol: { userId: fromUserId, symbol } },
        data: { amount: { decrement: amount }, costPrice: { decrement: costPrice } },
    });

    // Increment to user
    await tx.balance.upsert({
        where: { userId_symbol: { userId: toUserId, symbol } },
        update: { amount: { increment: amount }, costPrice: { increment: costPrice } },
        create: { userId: toUserId, symbol, amount, costPrice },
    });
}

export const checkBalance = async (
    tx: any,
    userId: number,
    symbol: string,
    requiredAmount: number,
): Promise<void> => {
    const balance = await tx.balance.findUnique({
        where: { userId_symbol: { userId, symbol } },
    });

    if (!balance || balance.amount < requiredAmount) {
        throw new BadRequestException(
            `Insufficient balance for ${symbol}. Available: ${balance?.amount ?? 0}, Required: ${requiredAmount}`
        );
    }
}

export const handleMarketOrder = async (
    tx: any,
    order: Order,
    userId: number,
    symbol: string,
    quantity: number,
    price: number,
    currentBalance: number,
): Promise<Order> => {
    if (order.type === 'sell') {
        await checkBalance(tx, userId, symbol, quantity);
        await transferBalance(tx, userId, 0, symbol, quantity, price * quantity);
        await recordTrade(tx, null, order.id, price, quantity, 0, userId);
    } else {

        if (!currentBalance) {
            const mmBalance = await tx.balance.findUnique({
                where: { userId_symbol: { userId: 0, symbol } },
            });
            currentBalance = mmBalance?.amount || 0;
        }
        if (currentBalance < quantity) {
            throw new BadRequestException(
                `Insufficient market inventory for ${symbol}. Available: ${currentBalance}, Required: ${quantity}`
            );
        }

        await transferBalance(tx, 0, userId, symbol, quantity, price * quantity);
        await recordTrade(tx, order.id, null, price, quantity, userId, 0);
    }

    return await updateOrderStatus(tx, order.id, 'filled', quantity);
}

export const handleLimitOrder = async (
    tx: any,
    order: Order,
    userId: number,
    symbol: string,
    quantity: number,
    price: number,
    type: 'buy' | 'sell',
): Promise<Order> => {
    // For both buy and sell orders, check if price equals current market price
    const currentMarketPrice = getCurrentMarketPrice(symbol);
    if (price === currentMarketPrice) {
        throw new BadRequestException(
            `${type === 'buy' ? 'Buy' : 'Sell'} order cannot be placed at current market price (${currentMarketPrice}). Use market order instead.`
        );
    }

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
            await transferBalance(tx, userId, matchingOrder.userId, symbol, tradeQuantity, tradePrice * tradeQuantity);
        } else {
            await transferBalance(tx, matchingOrder.userId, userId, symbol, tradeQuantity, tradePrice * tradeQuantity);
        }

        // Record trade
        await recordTrade(
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
            await updateOrderStatus(tx, matchingOrder.id, 'filled');
        }

        remaining -= tradeQuantity;
        totalFilled += tradeQuantity;
    }

    const finalStatus = totalFilled >= quantity ? 'filled' : 'open';
    return await updateOrderStatus(tx, order.id, finalStatus);
}