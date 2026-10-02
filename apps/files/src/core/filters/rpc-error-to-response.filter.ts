import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, of } from 'rxjs';

@Catch(RpcException)
// Превращает RPC-ошибку в обычный ответ для клиента.
export class RpcErrorToResponseFilter implements RpcExceptionFilter<RpcException> {
  // Возвращает содержимое ошибки, не пробрасывая исключение клиенту.
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const error = exception.getError();
    return of(error);
  }
}
