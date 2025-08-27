import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para desarrollo con Ionic
  app.enableCors({
    origin: ['http://localhost:8100'], // URL de ionic serve
    credentials: true,
  });

  // Validaciones globales para DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // lanza error si envían propiedades extra
      transform: true, // transforma tipos (ej. string a number)
    }),
  );

  // Configuración Swagger
  const config = new DocumentBuilder()
    .setTitle('API GastoFacil')
    .setDescription('Documentación de la API de GastoFacil')
    .setVersion('1.0')
    .addBearerAuth() // Para endpoints con JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
