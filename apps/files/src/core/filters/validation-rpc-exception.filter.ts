import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, of } from 'rxjs';

@Catch(RpcException)
export class ValidationRpcExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const error = exception.getError();

    // Возвращаем Normal Data (status: ok / success result) вместо вызова catchError на клиенте
    return of(error);
  }
}
