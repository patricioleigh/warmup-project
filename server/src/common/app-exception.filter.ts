import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ErrorCode, type ErrorCode as ErrorCodeType } from './error-codes';

type ErrorResponse = {
  errorId: string;
  code: ErrorCodeType;
  message: string;
  timestamp: string;
  path: string;
  requestId?: string;
  status: number;
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId;
    const path = req.originalUrl || req.url;
    const timestamp = new Date().toISOString();

    const errorId = `err_${randomUUID()}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCodeType = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse() as any;

      // Prefer explicit stable code when provided
      const maybeCode = payload?.code;
      if (typeof maybeCode === 'string') code = maybeCode as ErrorCodeType;
      else {
        // Otherwise map common statuses to stable codes
        if (status === HttpStatus.BAD_REQUEST) code = ErrorCode.VALIDATION_FAILED;
        else if (status === HttpStatus.UNAUTHORIZED) code = ErrorCode.AUTH_INVALID_TOKEN;
        else if (status === HttpStatus.FORBIDDEN) code = ErrorCode.FORBIDDEN;
        else if (status === HttpStatus.NOT_FOUND) code = ErrorCode.NOT_FOUND;
        else if (status === HttpStatus.TOO_MANY_REQUESTS) code = ErrorCode.RATE_LIMITED;
      }

      // Avoid leaking internal details; allow safe message override via payload.message
      const payloadMessage = payload?.message;
      if (typeof payloadMessage === 'string') message = payloadMessage;
      else if (Array.isArray(payloadMessage)) message = payloadMessage.join(', ');
      else message = exception.message || message;
    }

    const errorBody: ErrorResponse = {
      errorId,
      code,
      message,
      timestamp,
      path,
      requestId,
      status,
    };

    if (status >= 500) {
      this.logger.error(
        { errorId, requestId, path, status, code, message },
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn({ errorId, requestId, path, status, code, message });
    }

    res.status(status).json(errorBody);
  }
}

