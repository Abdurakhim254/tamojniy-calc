import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ensureDatabase } from './common/db';

async function bootstrap() {
  await ensureDatabase();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();

  const dist = join(__dirname, '..', '..', 'frontend', 'dist');
  if (existsSync(dist)) {
    app.useStaticAssets(dist);
    app.use((req: any, res: any, next: any) =>
      req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.') ? res.sendFile(join(dist, 'index.html')) : next());
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`Customs calculator API: http://localhost:${port}/api`);
}
bootstrap();
