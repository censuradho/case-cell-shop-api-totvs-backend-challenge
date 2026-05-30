import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { GetOrderStatusQuery } from '../application/queries/get-order-status.query';
import { CreateOrderDto } from '../application/dtos/create-order.dto';
import { CheckoutResponseDto } from '../application/dtos/checkout.response.dto';
import { OrderStatusResponseDto } from '../application/dtos/order-status.response.dto';
import { RequestId } from '@/shared/observability/request-id.decorator';

@ApiTags('Orders')
@Controller()
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderStatusQuery: GetOrderStatusQuery,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Iniciar checkout',
    description:
      'Cria um pedido de forma assíncrona. Reserva o estoque atomicamente e envia o processamento para fila. Retorna 202 com o ID e status inicial do pedido.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Chave única para evitar pedidos duplicados em caso de retry ou duplo clique',
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Pedido criado e enviado para processamento',
    type: CheckoutResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Header Idempotency-Key ausente ou body inválido',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Produto não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Estoque insuficiente',
  })
  async checkout(
    @Body() dto: CreateOrderDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @RequestId() requestId: string,
  ): Promise<CheckoutResponseDto> {
    const order = await this.createOrderUseCase.execute(
      dto,
      idempotencyKey,
      requestId,
    );
    return CheckoutResponseDto.fromEntity(order);
  }

  @Get('orders/:id/status')
  @ApiOperation({
    summary: 'Consultar status do pedido',
    description: 'Retorna o status atual e os detalhes do pedido pelo seu ID.',
  })
  @ApiParam({ name: 'id', description: 'ID do pedido', example: 'xyz789' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pedido encontrado',
    type: OrderStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pedido não encontrado',
  })
  async getStatus(
    @Param('id') id: string,
    @RequestId() requestId: string,
  ): Promise<OrderStatusResponseDto> {
    const order = await this.getOrderStatusQuery.execute(id, requestId);
    return OrderStatusResponseDto.fromEntity(order);
  }
}
