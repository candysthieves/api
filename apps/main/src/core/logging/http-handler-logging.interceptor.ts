import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable()
export class HttpHandlerLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpHandlerLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    if (
      request.method !== 'POST' ||
      (request.path !== '/api/v1/auth/login' && request.path !== '/api/v1/posts')
    ) {
      return next.handle();
    }

    const startedAt = Date.now();
    const requestId = (request as Request & { requestId?: string }).requestId ?? null;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    this.logger.log(
      JSON.stringify({
        event: 'http_handler_started',
        requestId,
        controller,
        handler,
      }),
    );

    return next.handle().pipe(
      tap(() =>
        this.logger.log(
          JSON.stringify({
            event: 'http_handler_completed',
            requestId,
            controller,
            handler,
            durationMs: Date.now() - startedAt,
          }),
        ),
      ),
      catchError((error: unknown) => {
        this.logger.error(
          JSON.stringify({
            event: 'http_handler_failed',
            requestId,
            controller,
            handler,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          }),
          error instanceof Error ? error.stack : undefined,
        );
        return throwError(() => error);
      }),
    );
  }
}
