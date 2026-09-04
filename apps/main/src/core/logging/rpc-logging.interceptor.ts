import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable()
export class RpcLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RpcLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();
    const startedAt = Date.now();
    const handler = context.getHandler().name;
    const pattern = context.switchToRpc().getContext()?.getPattern?.() ?? handler;
    this.logger.log(JSON.stringify({ event: 'rpc_request_started', pattern, handler }));
    return next.handle().pipe(
      tap(() => this.logger.log(JSON.stringify({ event: 'rpc_request_completed', pattern, handler, durationMs: Date.now() - startedAt }))),
      catchError((error: unknown) => {
        this.logger.error(JSON.stringify({ event: 'rpc_request_failed', pattern, handler, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) }), error instanceof Error ? error.stack : undefined);
        return throwError(() => error);
      }),
    );
  }
}
