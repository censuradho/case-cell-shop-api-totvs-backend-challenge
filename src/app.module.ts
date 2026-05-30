import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvModule } from './shared/env/env.module';
import { ENV_PROVIDER } from './shared/env/env.module';
import { PrismaModule } from './shared/database/prisma.module';
import { QueueModule } from './shared/queue/queue.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import type { IEnvProvider } from './shared/env';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    QueueModule,
    ObservabilityModule,
    ProductsModule,
    OrdersModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [EnvModule],
      inject: [ENV_PROVIDER],
      useFactory: (env: IEnvProvider) => ({
        stores: [createKeyv(env.getOrThrow('REDIS_URL'))],
        // global fallback TTL — override per call via cacheManager.set(key, value, ttl)
        ttl: 1 * 60 * 1000,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
