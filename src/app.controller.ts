import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Res } from '@nestjs/common';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description:
      'Verifica a conectividade com o banco de dados e o Redis. Retorna 200 quando todos os serviços estão operacionais e 503 quando há degradação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Todos os serviços operacionais',
    schema: {
      example: {
        status: 'ok',
        services: { database: 'ok', redis: 'ok' },
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Um ou mais serviços indisponíveis',
    schema: {
      example: {
        status: 'degraded',
        services: { database: 'error', redis: 'ok' },
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  async health(@Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.appService.getHealth();
    if (result.status === 'degraded') {
      reply.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
