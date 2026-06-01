import * as path from 'path';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { PrismaService } from './config/prisma.service';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';

/** `dist/main.js` → backend root; avoids missing `.env` when cwd is not `backend/` */
const backendRoot = path.resolve(__dirname, '..');
// 1) `.env` first — `override: true` so values here replace stale vars from the process manager (e.g. PM2).
dotenv.config({ path: path.join(backendRoot, '.env'), override: true });
const env = process.env.NODE_ENV || 'development';
// 2) `.env.development` / `.env.production` — team defaults (PORT, CORS, optional example DATABASE_URL).
dotenv.config({ path: path.join(backendRoot, `.env.${env}`), override: true });
// 3) `.env` again — on the server, keep DATABASE_URL / JWT here so they override `.env.production` after `git pull`.
dotenv.config({ path: path.join(backendRoot, '.env'), override: true });
// 4) `.env.*.local` last (gitignored), highest priority.
dotenv.config({ path: path.join(backendRoot, `.env.${env}.local`), override: true });

function logDatabaseUrlTarget() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    console.warn('[env] DATABASE_URL is missing. Set it in backend/.env or .env.production.local.');
    return;
  }
  try {
    const normalized = raw.replace(/^mysql:\/\//i, 'http://');
    const u = new URL(normalized);
    const db = u.pathname.replace(/^\//, '').split('/')[0] || '(no database)';
    console.log(
      `[env] Using MySQL ${u.hostname}:${u.port || '3306'} database "${db}" as user "${u.username || '(none)'}"`,
    );
  } catch {
    console.warn('[env] DATABASE_URL is set but could not be parsed for logging.');
  }
}
logDatabaseUrlTarget();

// Fix BigInt serialization error
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  /** Required for `socket.io-client` — default Nest WS adapter is plain `ws`, not Socket.IO. */
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalFilters(new PrismaExceptionFilter());

  // whitelist: false — never emit "property X should not exist" (class-validator WHITELIST).
  // Extra query/body keys are ignored by services that only destructure known fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('Comprehensive CRM API for real estate management')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;

  // Connection check before start
  const prismaService = app.get(PrismaService);
  try {
    await prismaService.$connect();
    console.log('\n' + '='.repeat(50));
    console.log(`\x1b[32m[DATABASE CONNECTED] Success\x1b[0m`);
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log(`\x1b[31m[DATABASE ERROR] Connection failed: ${error.message}\x1b[0m`);
    console.log('='.repeat(50) + '\n');
  }

  await app.listen(port);
  console.log(`[ValidationPipe] whitelist=false (assignedTo and other extra query params are allowed)`);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
  console.log(`[Socket.IO] Real-time notifications: ws path /socket.io (same port; Vite proxies in dev)`);
}
bootstrap();
