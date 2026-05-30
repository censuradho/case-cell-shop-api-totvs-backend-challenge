import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestIdMiddleware } from './request-id.middleware';
import { AppLogger } from './app-logger.service';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  providers: [
    AppLogger,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [AppLogger],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
