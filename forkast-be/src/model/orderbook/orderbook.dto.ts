import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceOrderDto {
  @ApiProperty({ example: 'BTC-USD', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: 50000, description: 'Order price' })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 1, description: 'Order quantity' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: false, description: 'Whether this is a market order', required: false })
  @IsBoolean()
  @IsOptional()
  market?: boolean;
}
