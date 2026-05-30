import { ApiProperty } from '@nestjs/swagger';
import type { CursorPaginationResult } from '@/shared/pagination/cursor-pagination.types';
import type { Product } from '../../domain/product.entity';
import { ProductResponseDto } from './product.response.dto';

export class PaginatedProductResponseDto implements CursorPaginationResult<Product> {
  @ApiProperty({
    type: [ProductResponseDto],
    description: 'Lista de produtos da página',
  })
  declare data: Product[];

  @ApiProperty({
    example: 'abc123',
    nullable: true,
    description:
      'Cursor para buscar a próxima página. Null quando não há mais itens.',
  })
  declare nextCursor: string | null;

  @ApiProperty({
    example: true,
    description: 'Indica se existe uma próxima página',
  })
  declare hasNextPage: boolean;
}
