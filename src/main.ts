import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (apps nativas)
      if (!origin) {
        return callback(null, true);
      }
      
      const allowed = [
        'https://app-gastofacil.vercel.app',  // Web producción
        'http://localhost:4200',              // Desarrollo Angular
        'http://localhost:8100',              // Desarrollo Ionic
        'https://localhost',                  // Android Capacitor
        'capacitor://localhost',              // iOS Capacitor
      ];
      
      // Permitir si está en la lista
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      
      // Permitir cualquier localhost (desarrollo)
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      
      // Rechazar otros
      console.warn('CORS: Origin rechazado ->', origin);
      callback(null, false);
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
