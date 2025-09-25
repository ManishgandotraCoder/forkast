import { INestApplication, ValidationPipe } from '@nestjs/common';

export function setupTestApp(app: INestApplication): void {
  // Apply the same validation pipe as in main.ts
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
}
