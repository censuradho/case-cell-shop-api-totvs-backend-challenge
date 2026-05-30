import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker/locale/pt_BR';
import { ulid } from 'ulidx';
import * as dotenv from 'dotenv';

dotenv.config();

const TOTAL_PRODUCTS = 200;

const BRANDS: Record<string, string[]> = {
  Apple: [
    'iPhone 15 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15 Plus',
    'iPhone 15',
    'iPhone 14 Pro Max',
    'iPhone 14 Pro',
    'iPhone 14',
    'iPhone 13',
  ],
  Samsung: [
    'Galaxy S24 Ultra',
    'Galaxy S24+',
    'Galaxy S24',
    'Galaxy S23 Ultra',
    'Galaxy A55',
    'Galaxy A35',
    'Galaxy A15',
    'Galaxy Z Flip 5',
  ],
  Xiaomi: [
    'Redmi Note 13 Pro',
    'Redmi Note 13',
    'Xiaomi 14 Ultra',
    'POCO X6 Pro',
    'POCO M6 Pro',
    'Redmi 13C',
  ],
  Motorola: [
    'Edge 50 Pro',
    'Edge 40 Pro',
    'Moto G85',
    'Moto G55',
    'Moto G35',
    'Moto G24',
    'Edge 30 Ultra',
  ],
  Google: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel 7 Pro'],
  Realme: ['GT 6', 'GT Neo 5', '12 Pro+', 'C65', 'Narzo 70 Pro'],
};

const CASE_TYPES = [
  'Silicone Premium',
  'TPU Transparente',
  'Couro Legítimo',
  'Vidro Temperado',
  'Anti-Impacto',
  'Carteira',
  'Magnética MagSafe',
  'Clear Case',
  'Bumper',
  'Fosca',
  'Glitter',
  'Carregamento Sem Fio',
];

const COLORS = [
  'Preta',
  'Branca',
  'Transparente',
  'Azul Marinho',
  'Verde Escuro',
  'Coral',
  'Lilás',
  'Grafite',
  'Rosa Claro',
  'Dourada',
];

const FEATURES = [
  'com proteção para câmera',
  'slim fit',
  'com suporte para cartão',
  'militar drop-proof',
  'biodegradável',
  'com pop socket',
  'ultra-fina',
];

function generateProduct() {
  const brandName = faker.helpers.arrayElement(Object.keys(BRANDS));
  const model = faker.helpers.arrayElement(BRANDS[brandName]);
  const caseType = faker.helpers.arrayElement(CASE_TYPES);
  const color = faker.helpers.arrayElement(COLORS);
  const feature = faker.helpers.maybe(
    () => faker.helpers.arrayElement(FEATURES),
    { probability: 0.5 },
  );

  const name = `Capinha ${brandName} ${model} — ${caseType} ${color}`;
  const description = [
    `Capinha ${caseType.toLowerCase()} para ${brandName} ${model}.`,
    `Cor: ${color}.`,
    feature ? `Design ${feature}.` : '',
    faker.commerce.productAdjective(),
    'proteção completa para o seu smartphone.',
  ]
    .filter(Boolean)
    .join(' ');

  const price = faker.commerce.price({ min: 19.9, max: 199.9, dec: 2 });
  const stock = faker.helpers.weightedArrayElement([
    { value: 0, weight: 5 },
    { value: faker.number.int({ min: 1, max: 10 }), weight: 10 },
    { value: faker.number.int({ min: 11, max: 100 }), weight: 50 },
    { value: faker.number.int({ min: 101, max: 500 }), weight: 35 },
  ]);

  return { id: ulid(), name, description, price, stock };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`Seeding ${TOTAL_PRODUCTS} products...`);

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  const products = Array.from({ length: TOTAL_PRODUCTS }, generateProduct);

  await prisma.product.createMany({ data: products });

  console.log(`✓ ${TOTAL_PRODUCTS} products created.`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
