import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
}

interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Formats ALL HttpExceptions into the FE-expected error envelope:
 * { statusCode, message, errors?: Record<string, string[]> }
 *
 * ValidationPipe (class-validator) errors look like:
 * { message: ValidationError[], error: "Bad Request", statusCode: 400 }
 * → mapped to { statusCode: 400, message: "Validation failed", errors: { field: ["msg"] } }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'An error occurred';
    let errors: Record<string, string[]> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as Record<string, unknown>;

      // ValidationPipe produces an array of ValidationError objects in `message`
      if (Array.isArray(res['message'])) {
        message = 'Validation failed';
        errors = mapValidationErrors(res['message'] as ValidationError[]);
      } else {
        message =
          typeof res['message'] === 'string'
            ? res['message']
            : exception.message;
      }
    }

    const body: ErrorResponse = { statusCode, message };
    if (errors) body.errors = errors;

    // Log 5xx errors server-side
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(
        `[${request.method}] ${request.url} → ${statusCode}`,
        exception.stack,
      );
    }

    response.status(statusCode).json(body);
  }
}

function mapValidationErrors(
  validationErrors: ValidationError[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const err of validationErrors) {
    if (err.constraints) {
      result[err.property] = Object.values(err.constraints);
    }
  }
  return result;
}
