import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../modules/crypto/encryption.service';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

async function encryptExistingData() {
    console.log('Starting data encryption migration...');

    // Initialize encryption service
    const configService = new ConfigService();
    const encryptionService = new EncryptionService(configService);

    try {
        // Get all users
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users to encrypt`);

        for (const user of users) {
            console.log(`Encrypting data for user: ${user.email}`);

            // Generate RSA key pair for user if they don't have one
            let publicKey = user.publicKey;
            if (!publicKey) {
                const keyPair = encryptionService.generateRSAKeyPair();
                publicKey = keyPair.publicKey;
            }

            // Encrypt user data
            const encryptedEmail = encryptionService.encryptWithRSA(user.email, publicKey);
            const encryptedName = encryptionService.encryptWithRSA(user.name, publicKey);

            // Update user with encrypted data
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    encryptedEmail,
                    encryptedName,
                    publicKey,
                },
            });

            // Encrypt user's orders
            const orders = await prisma.order.findMany({
                where: { userId: user.id },
            });

            for (const order of orders) {
                const encryptedSymbol = encryptionService.encryptWithAES(order.symbol).data;
                const encryptedPrice = encryptionService.encryptWithAES(order.price.toString()).data;
                const encryptedQuantity = encryptionService.encryptWithAES(order.quantity.toString()).data;

                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        encryptedSymbol,
                        encryptedPrice,
                        encryptedQuantity,
                    },
                });
            }

            // Encrypt user's balances
            const balances = await prisma.balance.findMany({
                where: { userId: user.id },
            });

            for (const balance of balances) {
                const encryptedSymbol = encryptionService.encryptWithAES(balance.symbol).data;
                const encryptedAmount = encryptionService.encryptWithAES(balance.amount.toString()).data;
                const encryptedLocked = encryptionService.encryptWithAES(balance.locked.toString()).data;

                await prisma.balance.update({
                    where: { id: balance.id },
                    data: {
                        encryptedSymbol,
                        encryptedAmount,
                        encryptedLocked,
                    },
                });
            }

            // Encrypt user's trades
            const trades = await prisma.trade.findMany({
                where: {
                    OR: [
                        { buyerUserId: user.id },
                        { sellerUserId: user.id },
                    ],
                },
            });

            for (const trade of trades) {
                const encryptedPrice = encryptionService.encryptWithAES(trade.price.toString()).data;
                const encryptedQuantity = encryptionService.encryptWithAES(trade.quantity.toString()).data;

                await prisma.trade.update({
                    where: { id: trade.id },
                    data: {
                        encryptedPrice,
                        encryptedQuantity,
                    },
                });
            }

            console.log(`Completed encryption for user: ${user.email}`);
        }

        console.log('Data encryption migration completed successfully!');
    } catch (error) {
        console.error('Error during data encryption migration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
encryptExistingData()
    .then(() => {
        console.log('Migration completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
