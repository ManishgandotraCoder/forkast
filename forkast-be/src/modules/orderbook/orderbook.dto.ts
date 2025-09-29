import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserDetailsDto {
  @ApiProperty({ example: '1', description: 'User ID' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @IsString()
  name: string;
}

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

  @ApiProperty({ example: false, description: 'Whether this is a P2P order', required: false })
  @IsBoolean()
  @IsOptional()
  p2p?: boolean;

  @ApiProperty({ example: 1000, description: 'Current balance for the order', required: false })
  @IsNumber({}, { message: 'currentBalance must be a number' })
  @IsOptional()
  currentBalance?: number;

  @ApiProperty({ example: 1, description: 'Seller ID for P2P orders', required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  sellerId?: number;

  @ApiProperty({
    example: 1,
    description: 'User ID for the order',
    required: false
  })
  @IsNumber()
  @IsOptional()
  userId?: number;
}
