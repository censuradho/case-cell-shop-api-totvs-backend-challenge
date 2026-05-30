import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { CursorPaginationParams } from '@/shared/pagination/cursor-pagination.types';

export class GetProductsQueryDto implements CursorPaginationParams {
  @ApiPropertyOptional({
    description: 'ID do último item recebido — define o ponto de início da próxima página',
    example: 'abc123',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;
}
