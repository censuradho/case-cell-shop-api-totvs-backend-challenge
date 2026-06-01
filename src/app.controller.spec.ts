import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { AppService } from './app.service';
import type { PrismaService } from './shared/database/prisma.service';

describe('AppService', () => {
  let service: AppService;
  let prisma: MockProxy<PrismaService>;
  let cacheManager: MockProxy<Cache>;

  beforeEach(() => {
    prisma = mock<PrismaService>();
    cacheManager = mock<Cache>();
    service = new AppService(prisma, cacheManager);

    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    cacheManager.get.mockResolvedValue(undefined);
  });

  describe('getHealth', () => {
    it('should return ok when database and redis are reachable', async () => {
      const result = await service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('ok');
      expect(result.services.redis).toBe('ok');
    });

    it('should return degraded with database error when prisma throws', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('error');
      expect(result.services.redis).toBe('ok');
    });

    it('should return degraded with redis error when cacheManager throws', async () => {
      cacheManager.get.mockRejectedValue(new Error('redis unavailable'));

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('ok');
      expect(result.services.redis).toBe('error');
    });

    it('should return degraded with both errors when all services fail', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('db down'));
      cacheManager.get.mockRejectedValue(new Error('redis down'));

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('error');
      expect(result.services.redis).toBe('error');
    });

    it('should include a timestamp in ISO format', async () => {
      const result = await service.getHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
