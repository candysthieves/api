import { ConsoleLogger } from '@nestjs/common';

const LOGIN_CONTEXTS = new Set([
  'HttpRequestLoggingMiddleware',
  'HttpHandlerLoggingInterceptor',
  'DomainExceptionFilter',
  'LoginUseCase',
  'AuthSessionService',
]);

const SERVICE_CONTEXTS = new Set([
  'Bootstrap',
  'PrismaService',
  'NestFactory',
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestApplication',
  'NestMicroservice',
  'ExceptionHandler',
  'ExceptionsHandler',
]);

/** Suppresses application logs outside service lifecycle and the login flow. */
export class ApplicationLogger extends ConsoleLogger {
  override log(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldWrite(optionalParams)) super.log(message, ...optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldWrite(optionalParams)) super.warn(message, ...optionalParams);
  }

  override error(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldWrite(optionalParams)) super.error(message, ...optionalParams);
  }

  override fatal(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldWrite(optionalParams)) super.fatal(message, ...optionalParams);
  }

  private shouldWrite(optionalParams: unknown[]): boolean {
    const context = optionalParams.at(-1);
    return (
      typeof context === 'string' &&
      (LOGIN_CONTEXTS.has(context) || SERVICE_CONTEXTS.has(context))
    );
  }
}
