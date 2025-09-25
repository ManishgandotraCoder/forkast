import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Ensure market user exists
    await prisma.$executeRaw`INSERT INTO "User" (id, email, password, name) VALUES (0, 'market@example.com', 'dummy', 'Market') ON CONFLICT (id) DO NOTHING;`;

    const symbols = [
        'BTC-USD',
        'ETH-USD',
        'XRP-USD',
        'DOGE-USD',
        'SOL-USD',
        'ADA-USD',
        'LTC-USD',
        'DOT-USD',
        'BCH-USD',
        'BNB-USD',
    ];

    for (const symbol of symbols) {
        await prisma.balance.upsert({
            where: {
                userId_symbol: {
                    userId: 0,
                    symbol: symbol,
                },
            },
            update: {
                amount: 100000,
            },
            create: {
                userId: 0,
                symbol: symbol,
                amount: 100000,
            },
        });
    }

    console.log('Market balances added successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
