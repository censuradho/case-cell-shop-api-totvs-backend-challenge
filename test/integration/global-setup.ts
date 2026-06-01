import { config } from 'dotenv';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

export async function setup() {
  config({ path: resolve(process.cwd(), '.env.test'), override: true });

  try {
    execSync('npx prisma migrate deploy', {
      env: process.env,
      stdio: 'inherit',
    });
  } catch {
    throw new Error(
      'prisma migrate deploy failed — ensure docker compose -f docker-compose.test.yml up -d is running',
    );
  }
}
