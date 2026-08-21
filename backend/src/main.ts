import { NestFactory } from '@nestjs/core';
import { NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// SSL_KEY_FILE / SSL_CRT_FILE point to an existing key/cert pair; falls back to plain HTTP if missing.
function getHttpsOptions(): NestApplicationOptions['httpsOptions'] {
  const keyPath = process.env.SSL_KEY_FILE;
  const certPath = process.env.SSL_CRT_FILE;
  if (!keyPath || !certPath) return undefined;
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) return undefined;

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

async function bootstrap() {
  const httpsOptions = getHttpsOptions();
  const app = await NestFactory.create(AppModule, { logger: false, httpsOptions });

  app.enableCors();
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`Application is running on: ${protocol}://localhost:${port}`);
}

void bootstrap();
