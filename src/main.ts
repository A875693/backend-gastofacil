import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS solo para web (las apps nativas no lo necesitan)
  const allowedOrigins = [
    'http://localhost:8100',              // Desarrollo local Ionic
    'http://localhost:4200',              // Desarrollo local Angular
    process.env.FRONTEND_URL,             // Web en producción (Vercel)
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Las apps nativas (Capacitor) no envían header Origin, permitirlas
      if (!origin) {
        return callback(null, true);
      }
      
      // Permitir localhost en cualquier puerto (desarrollo)
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      
      // Permitir orígenes específicos de producción
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Permitir otros orígenes pero loguear (en desarrollo es útil)
      console.warn('Origin no permitido pero se acepta:', origin);
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API GastoFacil')
    .setDescription('Documentación de la API de GastoFacil')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
