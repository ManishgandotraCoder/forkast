// BalanceController: Handles balance APIs
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { PrismaService } from '../../prisma.service';
import { BalancesResponseDto } from '../../common/dto/balance-response.dto';
import { ErrorResponseDto } from '../../common/dto/response.dto';

@ApiTags('balance')
@Controller('balance')
export class BalanceController {
    constructor(private readonly prisma: PrismaService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get user balances',
        description: 'Retrieve the authenticated user account balances for all cryptocurrencies'
    })
    @ApiResponse({
        status: 200,
        description: 'User balances retrieved successfully',
        type: BalancesResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async getBalances(@Request() req) {
        const balances = await this.prisma.balance.findMany({
            where: { userId: req.user.id },
        });
        return balances.map(b => ({
            asset: b.symbol,
            available: b.amount - b.locked,
            locked: b.locked,
            total: b.amount,
        }));
    }
}
