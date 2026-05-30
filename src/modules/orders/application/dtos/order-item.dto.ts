import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ example: 'abc123', description: 'ID do produto' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, description: 'Quantidade desejada', minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
