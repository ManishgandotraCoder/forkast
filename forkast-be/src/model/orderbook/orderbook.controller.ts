import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { OrderbookService } from './orderbook.service';
import { PlaceOrderDto } from './orderbook.dto';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { OrderResponseDto, OrderbookResponseDto, MyOrdersResponseDto } from '../../common/dto/order-response.dto';
import { TradeHistoryResponseDto } from '../../common/dto/trade-response.dto';
import { ErrorResponseDto } from '../../common/dto/response.dto';

@ApiTags('orderbook')
@Controller('orderbook')
export class OrderbookController {
    constructor(private readonly orderbookService: OrderbookService) { }

    @UseGuards(JwtAuthGuard)
    @Post('buy')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Place a buy order',
        description: 'Create a new buy order for a specific cryptocurrency symbol'
    })
    @ApiBody({ type: PlaceOrderDto })
    @ApiResponse({
        status: 201,
        description: 'Buy order placed successfully',
        type: OrderResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed or insufficient balance',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async placeBuyOrder(@Body() body: PlaceOrderDto, @Request() req) {
        return this.orderbookService.placeOrder(
            req.user.id,
            'buy',
            body.symbol,
            body.price,
            body.quantity,
            body.market || false,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post('sell')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Place a sell order',
        description: 'Create a new sell order for a specific cryptocurrency symbol'
    })
    @ApiBody({ type: PlaceOrderDto })
    @ApiResponse({
        status: 201,
        description: 'Sell order placed successfully',
        type: OrderResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed or insufficient balance',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async placeSellOrder(@Body() body: PlaceOrderDto, @Request() req) {
        return this.orderbookService.placeOrder(
            req.user.id,
            'sell',
            body.symbol,
            body.price,
            body.quantity,
            body.market || false,
        );
    }

    @Get()
    @ApiOperation({
        summary: 'Get orderbook',
        description: 'Retrieve the current orderbook with buy and sell orders, optionally filtered by symbol'
    })
    @ApiQuery({
        name: 'symbol',
        required: false,
        description: 'Filter by cryptocurrency symbol (e.g., BTC-USD)',
        example: 'BTC-USD'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number for pagination (default: 1)',
        type: Number,
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of items per page (default: 50)',
        type: Number,
        example: 50
    })
    @ApiResponse({
        status: 200,
        description: 'Orderbook retrieved successfully',
        type: OrderbookResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - invalid parameters',
        type: ErrorResponseDto
    })
    async getOrderbook(
        @Query('symbol') symbol?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 50;
        return this.orderbookService.getOrderbook(symbol, pageNum, limitNum);
    }

    @UseGuards(JwtAuthGuard)
    @Get('trades')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get trade history',
        description: 'Retrieve the authenticated user trade history with pagination'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number for pagination (default: 1)',
        type: Number,
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of items per page (default: 50)',
        type: Number,
        example: 50
    })
    @ApiResponse({
        status: 200,
        description: 'Trade history retrieved successfully',
        type: TradeHistoryResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - invalid parameters',
        type: ErrorResponseDto
    })
    async getTradeHistory(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 50;
        return this.orderbookService.getTradeHistory(req.user.id, pageNum, limitNum);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-orders')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get user orders',
        description: 'Retrieve the authenticated user orders with filtering and pagination'
    })
    @ApiQuery({
        name: 'symbol',
        required: false,
        description: 'Filter by cryptocurrency symbol (e.g., BTC-USD)',
        example: 'BTC-USD'
    })
    @ApiQuery({
        name: 'side',
        required: false,
        description: 'Filter by order side',
        enum: ['buy', 'sell'],
        example: 'buy'
    })
    @ApiQuery({
        name: 'status',
        required: false,
        description: 'Filter by order status',
        enum: ['open', 'filled', 'cancelled', 'partial'],
        example: 'open'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number for pagination (default: 1)',
        type: Number,
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of items per page (default: 50)',
        type: Number,
        example: 50
    })
    @ApiResponse({
        status: 200,
        description: 'User orders retrieved successfully',
        type: MyOrdersResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - invalid parameters',
        type: ErrorResponseDto
    })
    async getMyOrders(@Request() req, @Query() query: any) {
        return this.orderbookService.getMyOrders(req.user.id, query);
    }
}
