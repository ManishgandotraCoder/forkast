import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
    @ApiProperty({ description: 'Indicates if the request was successful' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Response data' })
    data?: T;

    @ApiProperty({ description: 'Error details if any', required: false })
    error?: string;
}

export class PaginationDto {
    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Number of items per page' })
    limit: number;

    @ApiProperty({ description: 'Total number of items' })
    total: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;
}

export class ErrorResponseDto {
    @ApiProperty({ example: false, description: 'Indicates if the request was successful' })
    success: boolean;

    @ApiProperty({ example: 'Error message', description: 'Error message' })
    message: string;

    @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Error code', required: false })
    errorCode?: string;

    @ApiProperty({ example: 400, description: 'HTTP status code' })
    statusCode: number;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'Timestamp of the error' })
    timestamp: string;

    @ApiProperty({ example: '/api/user/register', description: 'Request path' })
    path: string;
}
