import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger — habilitado por defecto, desactivar con SWAGGER_ENABLED=false
  const swaggerEnabled = configService.get<string>('SWAGGER_ENABLED', 'true') !== 'false';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('SEBI Chatbot API')
      .setDescription(
        'API Backend for the SEBI Chatbot application.\n\n' +
        '## Autenticación\n' +
        'La mayoría de los endpoints requieren un JWT token. ' +
        'Obtén uno via `POST /api/auth/login` o `POST /api/auth/google` y úsalo en el header `Authorization: Bearer <token>`.\n\n' +
        '## Módulos\n' +
        '- **Auth**: Registro, login y OAuth con Google\n' +
        '- **Chat**: Envío de mensajes al agente de IA (ADK/Cloud Run)\n' +
        '- **Conversations**: Historial de conversaciones\n' +
        '- **Suggestions**: Sugerencias de mensajes\n' +
        '- **Users**: Gestión de usuarios (admin)\n' +
        '- **Tracking**: Auditoría de eventos',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer(
        `http://localhost:${configService.get<number>('PORT', 3333)}`,
        'Local development',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  const port = configService.get<number>('PORT', 3333);
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on port ${port}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  }
}
bootstrap();
