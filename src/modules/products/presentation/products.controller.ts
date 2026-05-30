import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetProductsQuery } from '../application/queries/get-products.query';
import { GetProductsPaginatedQuery } from '../application/queries/get-products-paginated.query';
import { GetProductByIdQuery } from '../application/queries/get-product-by-id.query';
import { ProductResponseDto } from '../application/dtos/product.response.dto';
import { PaginatedProductResponseDto } from '../application/dtos/paginated-product.response.dto';
import { GetProductsQueryDto } from '../application/dtos/get-products-query.dto';
import { RequestId } from '@/shared/observability/request-id.decorator';
import type { Product } from '../domain/product.entity';
import type { CursorPaginationResult } from '@/shared/pagination/cursor-pagination.types';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProductsQuery: GetProductsQuery,
    private readonly getProductsPaginatedQuery: GetProductsPaginatedQuery,
    private readonly getProductByIdQuery: GetProductByIdQuery,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os produtos',
    description:
      'Retorna o catálogo completo de produtos. Resultado cacheado por 1 minuto no Redis (cache-aside). Emite métricas de cache.hit / cache.miss.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de produtos retornada com sucesso',
    type: [ProductResponseDto],
  })
  async findAll(@RequestId() requestId: string): Promise<Product[]> {
    return this.getProductsQuery.execute(requestId);
  }

  @Get('paginated')
  @ApiOperation({
    summary: 'Listar produtos com paginação via cursor',
    description:
      'Retorna produtos com paginação baseada em cursor. Passe o campo nextCursor da resposta anterior como parâmetro cursor para buscar a próxima página.',
  })
  @ApiResponse({
    status: 200,
    description: 'Página de produtos retornada com sucesso',
    type: PaginatedProductResponseDto,
  })
  async findPaginated(
    @Query() query: GetProductsQueryDto,
    @RequestId() requestId: string,
  ): Promise<CursorPaginationResult<Product>> {
    return this.getProductsPaginatedQuery.execute(query, requestId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar produto por ID',
    description:
      'Retorna um produto pelo seu ID. Resultado cacheado individualmente por 1 minuto no Redis.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do produto',
    example: 'abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async findById(
    @Param('id') id: string,
    @RequestId() requestId: string,
  ): Promise<Product> {
    return this.getProductByIdQuery.execute(id, requestId);
  }
}
