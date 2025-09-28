// BuyUsdtController: Handles buying USDT with USD/INR APIs
import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { BuyUsdtService } from './buy-usdt.service';
import { BuyUsdtDto, BuyUsdtResponseDto } from './buy-usdt.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ErrorResponseDto } from '../../common/dto/response.dto';

@ApiTags('buy-usdt')
@Controller('buy-usdt')
export class BuyUsdtController {
    constructor(private readonly buyUsdtService: BuyUsdtService) { }

    @UseGuards(JwtAuthGuard)
    @Post('')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Buy USDT with USD or INR',
        description: 'Purchase USDT using USD or INR currency'
    })
    @ApiBody({ type: BuyUsdtDto })
    @ApiResponse({
        status: 201,
        description: 'USDT purchased successfully',
        type: BuyUsdtResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - insufficient balance or validation failed',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async buyUsdt(@Request() req, @Body() body: BuyUsdtDto) {
        return this.buyUsdtService.buyUsdt(req.user.id, body);
    }

    @Get('exchange-rates')
    @ApiOperation({
        summary: 'Get current exchange rates',
        description: 'Retrieve current USD and INR to USDT exchange rates'
    })
    @ApiResponse({
        status: 200,
        description: 'Exchange rates retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                USD_TO_USDT: { type: 'number', example: 1.0 },
                INR_TO_USDT: { type: 'number', example: 83.5 }
            }
        }
    })
    async getExchangeRates() {
        return this.buyUsdtService.getExchangeRates();
    }
}


