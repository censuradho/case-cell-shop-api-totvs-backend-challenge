import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ENV_PROVIDER, EnvModule } from '../env/env.module';
import type { IEnvProvider } from '../env';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [EnvModule],
      inject: [ENV_PROVIDER],
      useFactory: (env: IEnvProvider) => {
        const redisUrl = new URL(env.getOrThrow('REDIS_URL'));
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port) || 6379,
            password: redisUrl.password || undefined,
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
