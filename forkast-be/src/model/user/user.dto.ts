// DTOs for user APIs
import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 25, description: 'User age', required: false, minimum: 13, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
  age?: number;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ example: 25, description: 'User age', required: false, minimum: 13, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
  age?: number;
}
