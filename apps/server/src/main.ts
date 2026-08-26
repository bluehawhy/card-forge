import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadServerConfig } from './config';

async function bootstrap(): Promise<void> {
  const config = loadServerConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.enableShutdownHooks();
  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
