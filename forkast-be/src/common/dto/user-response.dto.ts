import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
    @ApiProperty({ example: 1, description: 'User ID' })
    id: number;

    @ApiProperty({ example: 'user@example.com', description: 'User email' })
    email: string;

    @ApiProperty({ example: 'John Doe', description: 'User full name' })
    name: string;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'User creation timestamp' })
    createdAt: string;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'User last update timestamp' })
    updatedAt: string;
}

export class LoginResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT access token' })
    access_token: string;

    @ApiProperty({ example: 1, description: 'User ID' })
    userId: number;

    @ApiProperty({ example: 'user@example.com', description: 'User email' })
    email: string;

    @ApiProperty({ example: 'John Doe', description: 'User full name' })
    name: string;
}

export class RegisterResponseDto {
    @ApiProperty({ example: 1, description: 'User ID' })
    id: number;

    @ApiProperty({ example: 'user@example.com', description: 'User email' })
    email: string;

    @ApiProperty({ example: 'John Doe', description: 'User full name' })
    name: string;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'User creation timestamp' })
    createdAt: string;
}
