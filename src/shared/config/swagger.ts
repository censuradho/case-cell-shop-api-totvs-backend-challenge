import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('CaseCellShop API')
  .setVersion('1.0')
  .setDescription('Totvs S.A -  Backend Challenge')
  .build();
