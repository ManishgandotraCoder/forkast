import { ApiProperty } from '@nestjs/swagger';

export class BalanceResponseDto {
    @ApiProperty({ example: 'BTC', description: 'Asset symbol' })
    asset: string;

    @ApiProperty({ example: 1.5, description: 'Available balance' })
    available: number;

    @ApiProperty({ example: 0.2, description: 'Locked balance' })
    locked: number;

    @ApiProperty({ example: 1.7, description: 'Total balance' })
    total: number;
}

export class BalancesResponseDto {
    @ApiProperty({ description: 'User balances', type: [BalanceResponseDto] })
    balances: BalanceResponseDto[];
}
