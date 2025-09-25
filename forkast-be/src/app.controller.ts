import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    @ApiOperation({
        summary: 'Health check',
        description: 'Check if the API is running and healthy'
    })
    @ApiResponse({
        status: 200,
        description: 'API is healthy and running',
        schema: {
            type: 'string',
            example: 'Forkast Trading API is running!'
        }
    })
    getHello(): string {
        return this.appService.getHello();
    }
}
