import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as session from 'express-session';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule);

    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'gmail-api-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: { 
          maxAge: 24 * 60 * 60 * 1000,
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
        },
      }),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    const config = new DocumentBuilder()
      .setTitle('Gmail and Outlook Email API')
      .setDescription('Simple demo API for fetching emails from Gmail and Outlook using OAuth2')
      .setVersion('1.0.0')
      .addTag('Gmail', 'Gmail email operations')
      .addTag('Outlook', 'Outlook email operations')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    app.enableCors({
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Swagger documentation: http://localhost:${port}/api`);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();