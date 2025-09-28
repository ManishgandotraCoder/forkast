// UsdProfileController: Handles USD and profile operations APIs
import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsdProfileService } from './usd-profile.service';
import { ErrorResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsNumber, Min } from 'class-validator';

export class AddUsdDto {
    @IsNumber()
    @Min(0.01)
    amount: number;
}

@ApiTags('usd-profile')
@Controller('usd-profile')
export class UsdProfileController {
    constructor(private readonly usdProfileService: UsdProfileService) { }

    @UseGuards(JwtAuthGuard)
    @Get('balances')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get user balances',
        description: 'Retrieve all currency balances for the authenticated user'
    })
    @ApiResponse({
        status: 200,
        description: 'Balances retrieved successfully',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    symbol: { type: 'string', example: 'USD' },
                    amount: { type: 'number', example: 1000 },
                    locked: { type: 'number', example: 0 }
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async getUserBalances(@Request() req) {
        return this.usdProfileService.getUserBalances(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('usd-balance')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get USD balance',
        description: 'Retrieve USD balance for the authenticated user'
    })
    @ApiResponse({
        status: 200,
        description: 'USD balance retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                symbol: { type: 'string', example: 'USD' },
                amount: { type: 'number', example: 1000 },
                locked: { type: 'number', example: 0 }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async getUsdBalance(@Request() req) {
        return this.usdProfileService.getUsdBalance(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('transactions')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get user transactions',
        description: 'Retrieve recent transactions for the authenticated user'
    })
    @ApiResponse({
        status: 200,
        description: 'Transactions retrieved successfully',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'number', example: 1 },
                    type: { type: 'string', example: 'BUY_USDT' },
                    currency: { type: 'string', example: 'USD' },
                    amountSpent: { type: 'number', example: 100 },
                    usdtReceived: { type: 'number', example: 100 },
                    exchangeRate: { type: 'number', example: 1.0 },
                    createdAt: { type: 'string', example: '2024-01-21T10:30:00.000Z' }
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async getUserTransactions(@Request() req) {
        return this.usdProfileService.getUserTransactions(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('add-usd')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Add USD to user account',
        description: 'Add USD amount to the authenticated user account'
    })
    @ApiBody({ type: AddUsdDto })
    @ApiResponse({
        status: 201,
        description: 'USD added successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                amountAdded: { type: 'number', example: 100 }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async addUsdToUser(@Request() req, @Body() body: AddUsdDto) {
        return this.usdProfileService.addUsdToUser(req.user.id, body.amount);
    }
}


