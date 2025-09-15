import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Enable CORS for microservices communication
  app.enableCors();

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Orders API is running on port ${port}`);
}
bootstrap();
