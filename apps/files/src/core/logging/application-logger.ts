import { ConsoleLogger } from '@nestjs/common';

const SERVICE_CONTEXTS = new Set([
  'Bootstrap',
  'NestFactory',
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestApplication',
  'NestMicroservice',
  'ExceptionHandler',
  'ExceptionsHandler',
]);

/** Suppresses files-domain logs while preserving framework and service lifecycle logs. */
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
    return typeof context === 'string' && SERVICE_CONTEXTS.has(context);
  }
}
