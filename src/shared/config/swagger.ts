import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('CaseCellShop API')
  .setVersion('1.0')
  .setDescription('Totvs S.A — Backend Challenge')
  .addTag('Products', 'Catálogo de produtos com cache e paginação')
  .addTag('Orders', 'Checkout assíncrono e acompanhamento de pedidos')
  .build();
