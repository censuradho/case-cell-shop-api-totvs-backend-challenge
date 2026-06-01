import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from './shared/database/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const services: HealthStatus['services'] = {
      database: 'ok',
      redis: 'ok',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      services.database = 'error';
    }

    try {
      await this.cacheManager.get('__health__');
    } catch {
      services.redis = 'error';
    }

    const status = Object.values(services).every((s) => s === 'ok')
      ? 'ok'
      : 'degraded';

    return { status, services, timestamp: new Date().toISOString() };
  }
}
