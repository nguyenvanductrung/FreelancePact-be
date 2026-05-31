import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Shape returned by paginated controller methods */
interface PaginatedPayload<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Wraps every successful controller response in the FE-expected envelope:
 *
 *  Single object  →  { data: T, message: "OK" }
 *  Paginated list →  { data: T[], total, page, pageSize }  (passed through as-is)
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, unknown>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        // Already a paginated envelope — pass through untouched
        if (isPaginated(value)) {
          return value;
        }

        // Wrap single value
        return { data: value, message: 'OK' };
      }),
    );
  }
}

function isPaginated(value: unknown): value is PaginatedPayload<unknown> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    'data' in v &&
    'total' in v &&
    'page' in v &&
    'pageSize' in v &&
    Array.isArray(v['data'])
  );
}
