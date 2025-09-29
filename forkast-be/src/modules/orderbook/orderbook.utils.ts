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
    p2p: boolean = false,
): Promise<Order> => {
    // For buy orders, check and lock USD balance
    if (type === 'buy') {
        const requiredUsd = quantity * price;
        await checkBalance(tx, userId, 'USD', requiredUsd);

        // Lock the USD amount for the order
        await tx.balance.update({
            where: { userId_symbol: { userId, symbol: 'USD' } },
            data: {
                amount: { decrement: requiredUsd },
                locked: { increment: requiredUsd }
            },
        });
    } else if (type === 'sell') {
        // For sell orders, check and lock crypto balance
        await checkBalance(tx, userId, symbol, quantity);

        // Lock the crypto amount for the order
        await tx.balance.update({
            where: { userId_symbol: { userId, symbol } },
            data: {
                amount: { decrement: quantity },
                locked: { increment: quantity }
            },
        });
    }

    return tx.order.create({
        data: {
            userId,
            type,
            symbol,
            price,
            quantity,
            market,
            p2p,
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
    // For market maker (userId: 0), we don't need to create a balance record
    // as it represents infinite liquidity
    if (fromUserId !== 0) {
        // Decrement from user
        await tx.balance.update({
            where: { userId_symbol: { userId: fromUserId, symbol } },
            data: { amount: { decrement: amount }, costPrice: { decrement: costPrice } },
        });
    }

    if (toUserId !== 0) {
        await tx.balance.upsert({
            where: { userId_symbol: { userId: toUserId, symbol } },
            update: { amount: { increment: amount }, costPrice: { increment: costPrice } },
            create: { userId: toUserId, symbol, amount, costPrice },
        });
    }
}

export const transferFromLockedBalance = async (
    tx: any,
    fromUserId: number,
    toUserId: number,
    symbol: string,
    amount: number,
    costPrice: number,
): Promise<void> => {
    // For market maker (userId: 0), we don't need to create a balance record
    // as it represents infinite liquidity
    if (fromUserId !== 0) {
        // Transfer from locked to available for the sender
        await tx.balance.update({
            where: { userId_symbol: { userId: fromUserId, symbol } },
            data: {
                locked: { decrement: amount },
                costPrice: { decrement: costPrice }
            },
        });
    }

    // Only increment to user if they are not the market maker (userId: 0)
    if (toUserId !== 0) {
        await tx.balance.upsert({
            where: { userId_symbol: { userId: toUserId, symbol } },
            update: { amount: { increment: amount }, costPrice: { increment: costPrice } },
            create: { userId: toUserId, symbol, amount, costPrice },
        });
    }
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
    const availableAmount = balance ? balance.amount - balance.locked : 0;
    if (!balance || availableAmount < requiredAmount) {
        throw new BadRequestException(
            `Insufficient balance for ${symbol}. Available: ${availableAmount.toFixed(2)}, Required: ${requiredAmount.toFixed(2)}`
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
        // For BUY orders, check if user has enough USD to buy
        const requiredUsd = quantity * price;
        await checkBalance(tx, userId, 'USD', requiredUsd);

        // Transfer USD from user to market maker and crypto from market maker to user
        await transferBalance(tx, userId, 0, 'USD', requiredUsd, requiredUsd);
        await transferBalance(tx, 0, userId, symbol, quantity, price * quantity);
        await recordTrade(tx, order.id, null, price, quantity, userId, 0);
    }

    return await updateOrderStatus(tx, order.id, 'filled', quantity);
}

export const handleP2POrder = async (
    tx: any,
    order: Order,
    userId: number,
    symbol: string,
    quantity: number,
    price: number,
    type: 'buy' | 'sell',
    sellerId?: number,
): Promise<Order> => {
    if (!sellerId) {
        throw new BadRequestException('Seller ID is required for P2P orders');
    }

    // Find the matching order from the other party
    const oppositeType = type === 'buy' ? 'sell' : 'buy';
    console.log({
        userId: sellerId,
        type: oppositeType,
        symbol,
        status: 'open'
    });

    const matchingOrder = await tx.order.findFirst({
        where: {
            // userId: sellerId,
            type: oppositeType,
            symbol,
            status: 'open',
            price: type === 'buy' ? { lte: price } : { gte: price }, // Buy orders match with sell orders at or below price
        },
        orderBy: type === 'buy' ? [{ price: 'asc' }, { createdAt: 'asc' }] : [{ price: 'desc' }, { createdAt: 'asc' }],
    });

    if (!matchingOrder) {
        throw new BadRequestException(`No matching ${oppositeType} order found for P2P trade`);
    }

    // Calculate the trade quantity (minimum of both orders' remaining quantities)
    const availableQuantity = matchingOrder.quantity - matchingOrder.filledQuantity;
    const tradeQuantity = Math.min(quantity, availableQuantity);
    const tradePrice = matchingOrder.price; // Use the matching order's price

    if (type === 'buy') {
        // For buy orders: buyer gives USD to seller, seller gives crypto to buyer
        const requiredUsd = tradeQuantity * tradePrice;

        // Check if buyer has enough USD
        await checkBalance(tx, userId, 'USD', requiredUsd);

        // Check if seller has enough crypto
        // await checkBalance(tx, sellerId, symbol, tradeQuantity);

        // Transfer USD from buyer to seller
        await transferBalance(tx, userId, sellerId, 'USD', requiredUsd, requiredUsd);

        // Transfer crypto from seller to buyer
        await transferBalance(tx, sellerId, userId, symbol, tradeQuantity, requiredUsd);

        // Record the trade
        await recordTrade(tx, order.id, matchingOrder.id, tradePrice, tradeQuantity, userId, sellerId);

        // Update both orders' filled quantities
        await tx.order.update({
            where: { id: order.id },
            data: { filledQuantity: { increment: tradeQuantity } },
        });

        await tx.order.update({
            where: { id: matchingOrder.id },
            data: { filledQuantity: { increment: tradeQuantity } },
        });

        // Check if orders are fully filled and update status
        const updatedOrder = await tx.order.findUnique({ where: { id: order.id } });
        const updatedMatchingOrder = await tx.order.findUnique({ where: { id: matchingOrder.id } });

        if (updatedOrder && updatedOrder.filledQuantity >= updatedOrder.quantity) {
            await updateOrderStatus(tx, order.id, 'filled');
        }

        if (updatedMatchingOrder && updatedMatchingOrder.filledQuantity >= updatedMatchingOrder.quantity) {
            await updateOrderStatus(tx, matchingOrder.id, 'filled');
        }

        return updatedOrder || order;
    } else {
        // For sell orders: seller gives crypto to buyer, buyer gives USD to seller
        const receivedUsd = tradeQuantity * tradePrice;

        // Check if seller has enough crypto
        // await checkBalance(tx, userId, symbol, tradeQuantity);

        // Check if buyer has enough USD
        await checkBalance(tx, sellerId, 'USD', receivedUsd);

        // Transfer crypto from seller to buyer
        await transferBalance(tx, userId, sellerId, symbol, tradeQuantity, receivedUsd);

        // Transfer USD from buyer to seller
        await transferBalance(tx, sellerId, userId, 'USD', receivedUsd, receivedUsd);

        // Record the trade
        await recordTrade(tx, matchingOrder.id, order.id, tradePrice, tradeQuantity, sellerId, userId);

        // Update both orders' filled quantities
        await tx.order.update({
            where: { id: order.id },
            data: { filledQuantity: { increment: tradeQuantity } },
        });

        await tx.order.update({
            where: { id: matchingOrder.id },
            data: { filledQuantity: { increment: tradeQuantity } },
        });

        // Check if orders are fully filled and update status
        const updatedOrder = await tx.order.findUnique({ where: { id: order.id } });
        const updatedMatchingOrder = await tx.order.findUnique({ where: { id: matchingOrder.id } });

        if (updatedOrder && updatedOrder.filledQuantity >= updatedOrder.quantity) {
            await updateOrderStatus(tx, order.id, 'filled');
        }

        if (updatedMatchingOrder && updatedMatchingOrder.filledQuantity >= updatedMatchingOrder.quantity) {
            await updateOrderStatus(tx, matchingOrder.id, 'filled');
        }

        return updatedOrder || order;
    }
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

        // Transfer balance - use locked balances for order matching
        if (type === 'sell') {
            // Seller transfers crypto to buyer, buyer transfers USD to seller
            await transferFromLockedBalance(tx, userId, matchingOrder.userId, symbol, tradeQuantity, tradePrice * tradeQuantity);
            await transferFromLockedBalance(tx, matchingOrder.userId, userId, 'USD', tradePrice * tradeQuantity, tradePrice * tradeQuantity);
        } else {
            // Buyer transfers USD to seller, seller transfers crypto to buyer
            await transferFromLockedBalance(tx, userId, matchingOrder.userId, 'USD', tradePrice * tradeQuantity, tradePrice * tradeQuantity);
            await transferFromLockedBalance(tx, matchingOrder.userId, userId, symbol, tradeQuantity, tradePrice * tradeQuantity);
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

        const updatedMatchingOrder = await tx.order.update({
            where: { id: matchingOrder.id },
            data: { filledQuantity: { increment: tradeQuantity } },
        });

        // Close matching order if fully filled
        if (updatedMatchingOrder.filledQuantity >= updatedMatchingOrder.quantity) {
            await updateOrderStatus(tx, matchingOrder.id, 'filled');
        }

        remaining -= tradeQuantity;
        totalFilled += tradeQuantity;
    }

    const finalStatus = totalFilled >= quantity ? 'filled' : 'open';
    return await updateOrderStatus(tx, order.id, finalStatus);
}