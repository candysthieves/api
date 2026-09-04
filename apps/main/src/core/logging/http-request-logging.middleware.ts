import { Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';

/** Logs every request without recording bodies, cookies, or authorization headers. */
export class HttpRequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpRequestLoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = getRequestId(request);
    const startedAt = Date.now();
    let completed = false;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    this.logger.log(JSON.stringify({ event: 'http_request_started', requestId, method: request.method, path: request.path, remoteAddress: request.ip }));

    const complete = (event: 'http_request_completed' | 'http_request_aborted') => {
      if (completed) return;
      completed = true;
      this.logger.log(JSON.stringify({ event, requestId, method: request.method, path: request.path, statusCode: response.statusCode, durationMs: Date.now() - startedAt, responseSizeBytes: response.getHeader('content-length') ?? null }));
    };
    response.once('finish', () => complete('http_request_completed'));
    response.once('close', () => complete('http_request_aborted'));
    next();
  }
}

function getRequestId(request: Request): string {
  const suppliedId = request.header(REQUEST_ID_HEADER);
  return suppliedId && /^[a-zA-Z0-9_-]{1,128}$/.test(suppliedId) ? suppliedId : randomUUID();
}
