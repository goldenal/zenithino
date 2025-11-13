import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface ResponseFormat<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>>
{
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { user?: any }>();
    const { method, url, body, query, params } = request ?? {};
    const userId = request?.user?.id;

    this.logger.debug({
      message: 'Incoming request',
      method,
      url,
      params,
      query,
      body,
      userId,
    });

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = httpContext.getResponse<Response>();
          this.logger.debug({
            message: 'Outgoing response',
            statusCode: response?.statusCode,
            durationMs: Date.now() - start,
            data,
          });
        },
        error: (error) => {
          const response = httpContext.getResponse<Response>();
          this.logger.error({
            message: 'Request failed',
            statusCode: response?.statusCode,
            durationMs: Date.now() - start,
            error: error?.message,
            stack: error?.stack,
          });
        },
      }),
      map((data) => ({ data })),
    );
  }
}
