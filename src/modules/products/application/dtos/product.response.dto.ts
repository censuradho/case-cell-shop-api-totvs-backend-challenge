import { ApiProperty } from '@nestjs/swagger';
import type { Product } from '../../domain/product.entity';
import type { Decimal } from '@prisma/client/runtime/client';

export class ProductResponseDto implements Product {
  @ApiProperty({ example: 'abc123', description: 'ID único do produto' })
  declare id: string;

  @ApiProperty({
    example: 'Capinha iPhone 15 Pro Max',
    description: 'Nome do produto',
  })
  declare name: string;

  @ApiProperty({
    example: 'Capinha de silicone premium com bordas reforçadas',
    description: 'Descrição do produto',
  })
  declare description: string;

  @ApiProperty({
    type: 'string',
    example: '29.90',
    description: 'Preço do produto em reais (serializado como string)',
  })
  declare price: Decimal;

  @ApiProperty({
    example: 150,
    description: 'Quantidade disponível em estoque',
  })
  declare stock: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Data de criação',
  })
  declare createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Data da última atualização',
  })
  declare updatedAt: Date;
}
