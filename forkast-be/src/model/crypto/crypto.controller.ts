import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import yahooFinance from 'yahoo-finance2';
import { CryptoQuoteResponseDto, CryptoErrorResponseDto } from '../../common/dto/crypto-response.dto';
import { ErrorResponseDto } from '../../common/dto/response.dto';
import { cryptoList } from 'src/constants/crypto';

interface CryptoQuote {
    symbol: string;
    price: number;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    marketCap: number;
}

@ApiTags('crypto')
@Controller('crypto')
export class CryptoController {
    @Get('batch')
    @ApiOperation({
        summary: 'Get batch cryptocurrency quotes',
        description: 'Retrieve current prices and market data for multiple cryptocurrencies'
    })
    @ApiQuery({
        name: 'symbols',
        required: false,
        description: 'Comma-separated list of cryptocurrency symbols (e.g., BTC-USD,ETH-USD)',
        example: 'BTC-USD,ETH-USD,SOL-USD'
    })
    @ApiResponse({
        status: 200,
        description: 'Cryptocurrency quotes retrieved successfully',
        type: [CryptoQuoteResponseDto]
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - invalid symbols',
        type: ErrorResponseDto
    })
    async getBatchQuotes(
        @Query('symbols') symbols?: string,
    ): Promise<CryptoQuote[]> {
        return cryptoList
    }

    @Get(':symbol')
    @ApiOperation({
        summary: 'Get single cryptocurrency quote',
        description: 'Retrieve current price and market data for a specific cryptocurrency'
    })
    @ApiParam({
        name: 'symbol',
        description: 'Cryptocurrency symbol (e.g., BTC-USD)',
        example: 'BTC-USD'
    })
    @ApiResponse({
        status: 200,
        description: 'Cryptocurrency quote retrieved successfully',
        type: CryptoQuoteResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - invalid symbol',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Cryptocurrency not found',
        type: CryptoErrorResponseDto
    })
    async getSingleQuote(
        @Param('symbol') symbol: string,
    ): Promise<CryptoQuote | { error: string }> {
        try {
            const quote = (await yahooFinance.quote(symbol)) as any;
            return {
                symbol: String(quote.symbol),
                price: Number(quote.regularMarketPrice),
                shortName: String(quote.shortName ?? ''),
                regularMarketPrice: Number(quote.regularMarketPrice ?? 0),
                regularMarketChange: Number(quote.regularMarketChange ?? 0),
                regularMarketChangePercent: Number(quote.regularMarketChangePercent ?? 0),
                marketCap: Number(quote.marketCap ?? 0)
            };
        } catch {
            return { error: 'Failed to fetch quote' };
        }
    }
}
