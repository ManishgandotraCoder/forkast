import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration
  app.enableCors({
    origin: configService.get('cors.origin'),
    credentials: configService.get('cors.credentials'),
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Forkast Trading API')
    .setDescription(`
      A comprehensive cryptocurrency trading platform API that provides:
      
      ## Features
      - **User Management**: Registration, authentication, and profile management
      - **Order Management**: Place buy/sell orders, view order history with pagination
      - **Trading Engine**: Real-time order matching and trade execution
      - **Portfolio Management**: View balances and trade history
      - **Market Data**: Real-time cryptocurrency prices and market information
      
      ## Authentication
      Most endpoints require Bearer token authentication. Get your token by logging in.
      
      ## Pagination
      List endpoints support pagination with \`page\` and \`limit\` query parameters.
      
      ## Rate Limiting
      API requests are rate limited to ensure fair usage.
      
      ## Support
      For support and questions, please contact the development team.
    `)
    .setVersion('1.0.0')
    .setContact('Forkast Team', 'https://forkast.com', 'support@forkast.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addServer('http://localhost:3001', 'Development server')
    .addServer('https://api.forkast.com', 'Production server')
    .addTag('health', 'Health check endpoints')
    .addTag('users', 'User management and authentication')
    .addTag('orderbook', 'Trading and order management')
    .addTag('balance', 'User balance and portfolio management')
    .addTag('crypto', 'Cryptocurrency market data')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Forkast Trading API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
  });

  const port = configService.get('port');
  await app.listen(port);

  logger.log(`Application is running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api`);
}
void bootstrap();
