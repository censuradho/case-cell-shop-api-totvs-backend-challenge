import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { ENV_PROVIDER } from './shared/env/env.module';
import { IEnvProvider } from './shared/env';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ENV_PROVIDER],
      useFactory: (env: IEnvProvider) => ({
        stores: [createKeyv(env.getOrThrow('REDIS_URL'))],
        ttl: 1 * 60 * 1000,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
