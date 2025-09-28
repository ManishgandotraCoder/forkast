// BuyUsdtService: Business logic for buying USDT with USD/INR
import {
    Injectable,
    Logger,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BuyUsdtDto } from './buy-usdt.dto';

@Injectable()
export class BuyUsdtService {
    private logger = new Logger(BuyUsdtService.name);

    constructor(private prisma: PrismaService) { }

    async buyUsdt(userId: number, data: BuyUsdtDto) {
        try {
            // Check if user exists
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Calculate USDT amount to receive
            const usdtReceived = data.amount / data.exchangeRate;

            // Check user's balance for the currency
            const userBalance = await this.prisma.balance.findUnique({
                where: {
                    userId_symbol: {
                        userId: userId,
                        symbol: data.currency,
                    },
                },
            });

            if (!userBalance || userBalance.amount < data.amount) {
                throw new BadRequestException(`Insufficient ${data.currency} balance`);
            }

            // Start transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Deduct currency from user's balance
                await tx.balance.update({
                    where: {
                        userId_symbol: {
                            userId: userId,
                            symbol: data.currency,
                        },
                    },
                    data: {
                        amount: {
                            decrement: data.amount,
                        },
                    },
                });

                // Add USDT to user's balance or create if doesn't exist
                const existingUsdtBalance = await tx.balance.findUnique({
                    where: {
                        userId_symbol: {
                            userId: userId,
                            symbol: 'USDT',
                        },
                    },
                });

                if (existingUsdtBalance) {
                    await tx.balance.update({
                        where: {
                            userId_symbol: {
                                userId: userId,
                                symbol: 'USDT',
                            },
                        },
                        data: {
                            amount: {
                                increment: usdtReceived,
                            },
                        },
                    });
                } else {
                    await tx.balance.create({
                        data: {
                            userId: userId,
                            symbol: 'USDT',
                            amount: usdtReceived,
                        },
                    });
                }

                // Create transaction record
                const transaction = await tx.userTransaction.create({
                    data: {
                        userId: userId,
                        type: 'BUY_USDT',
                        currency: data.currency,
                        amountSpent: data.amount,
                        usdtReceived: usdtReceived,
                        exchangeRate: data.exchangeRate,
                    },
                });

                return transaction;
            });

            this.logger.log(`User ${userId} bought ${usdtReceived} USDT with ${data.amount} ${data.currency}`);
            return {
                id: result.id,
                currency: data.currency,
                amountSpent: data.amount,
                usdtReceived: usdtReceived,
                exchangeRate: data.exchangeRate,
                timestamp: result.createdAt.toISOString(),
            };
        } catch (error) {
            this.logger.error(
                `Failed to buy USDT for userId: ${userId}`,
                error.stack,
            );
            throw error;
        }
    }

    async getExchangeRates() {
        try {
            // In a real application, you would fetch these from an external API
            // For now, we'll return mock rates
            return {
                USD_TO_USDT: 1.0,
                INR_TO_USDT: 83.5, // Approximate rate
            };
        } catch (error) {
            this.logger.error('Failed to get exchange rates', error.stack);
            throw error;
        }
    }
}


