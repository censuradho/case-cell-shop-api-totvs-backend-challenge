import { Global, Module } from '@nestjs/common';
import { EnvProvider } from './EnvProvider';

export const ENV_PROVIDER = 'ENV_PROVIDER' as const;

@Global()
@Module({
  providers: [
    {
      provide: ENV_PROVIDER,
      useClass: EnvProvider,
    },
  ],
  exports: [ENV_PROVIDER],
})
export class EnvModule {}
