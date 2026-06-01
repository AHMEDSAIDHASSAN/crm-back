import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Maps Prisma connection / availability errors to 503 so clients see a clear signal
 * instead of a generic 500 when MySQL is down or unreachable (common in local dev).
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientRustPanicError,
    host: ArgumentsHost,
  ) {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      const isProd = process.env.NODE_ENV === 'production';
      message = isProd
        ? 'Database is unavailable. Ensure MySQL is running on the host in DATABASE_URL, the port is open, and credentials match (e.g. backend/.env.production or server environment variables).'
        : 'Database is unavailable. Start MySQL (e.g. repo root: docker compose up -d), then set DATABASE_URL in backend/.env — see backend/.env.example and .env.development.local.example.';
      this.logger.warn(exception.message);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P1000: auth failed, P1001: unreachable, P1017: connection closed
      if (['P1000', 'P1001', 'P1017'].includes(exception.code)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message =
          'Database connection failed. Check DATABASE_URL, credentials, and that MySQL is running.';
      }
      this.logger.warn(`[${exception.code}] ${exception.message}`);
    } else {
      this.logger.error(exception.message);
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
    };
    if (process.env.NODE_ENV === 'development') {
      body.error = exception.name;
      body.detail = exception.message;
    }

    res.status(status).json(body);
  }
}

