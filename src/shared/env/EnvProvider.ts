import * as dotenv from 'dotenv';
import { Injectable } from '@nestjs/common';
import type { IEnvProvider } from './IEnvProvider';

dotenv.config();

type EnvKey = Parameters<IEnvProvider['get']>[0];

@Injectable()
export class EnvProvider implements IEnvProvider {
  get(key: EnvKey): string | undefined {
    return process.env[key];
  }

  getOrThrow(key: EnvKey): string {
    const value = process.env[key];
    if (value === undefined || value === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
}
