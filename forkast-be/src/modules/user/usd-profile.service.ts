// UsdProfileService: Business logic for USD and profile operations
import {
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UsdProfileService {
    private logger = new Logger(UsdProfileService.name);

    constructor(private prisma: PrismaService) { }

    async getUserBalances(userId: number) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const balances = await this.prisma.balance.findMany({
                where: { userId: userId },
                select: {
                    symbol: true,
                    amount: true,
                    locked: true,
                },
            });

            this.logger.log(`Balances retrieved for user: ${userId}`);
            return balances;
        } catch (error) {
            this.logger.error(
                `Failed to get balances for userId: ${userId}`,
                error.stack,
            );
            throw error;
        }
    }

    async getUserTransactions(userId: number) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const transactions = await this.prisma.userTransaction.findMany({
                where: { userId: userId },
                orderBy: { createdAt: 'desc' },
                take: 50, // Limit to last 50 transactions
            });

            this.logger.log(`Transactions retrieved for user: ${userId}`);
            return transactions;
        } catch (error) {
            this.logger.error(
                `Failed to get transactions for userId: ${userId}`,
                error.stack,
            );
            throw error;
        }
    }

    async getUsdBalance(userId: number) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const usdBalance = await this.prisma.balance.findUnique({
                where: {
                    userId_symbol: {
                        userId: userId,
                        symbol: 'USD',
                    },
                },
            });

            this.logger.log(`USD balance retrieved for user: ${userId}`);
            return {
                symbol: 'USD',
                amount: usdBalance?.amount || 0,
                locked: usdBalance?.locked || 0,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get USD balance for userId: ${userId}`,
                error.stack,
            );
            throw error;
        }
    }

    async addUsdToUser(userId: number, amount: number) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const existingBalance = await this.prisma.balance.findUnique({
                where: {
                    userId_symbol: {
                        userId: userId,
                        symbol: 'USD',
                    },
                },
            });

            if (existingBalance) {
                await this.prisma.balance.update({
                    where: {
                        userId_symbol: {
                            userId: userId,
                            symbol: 'USD',
                        },
                    },
                    data: {
                        amount: {
                            increment: amount,
                        },
                    },
                });
            } else {
                await this.prisma.balance.create({
                    data: {
                        userId: userId,
                        symbol: 'USD',
                        amount: amount,
                    },
                });
            }

            this.logger.log(`Added ${amount} USD to user: ${userId}`);
            return { success: true, amountAdded: amount };
        } catch (error) {
            this.logger.error(
                `Failed to add USD to user: ${userId}`,
                error.stack,
            );
            throw error;
        }
    }
}


