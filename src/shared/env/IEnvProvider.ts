interface EnvironmentVariables {
  DATABASE_URL: string;
  REDIS_URL: string;
}

export interface IEnvProvider {
  get(key: keyof EnvironmentVariables): string | undefined;
  getOrThrow(key: keyof EnvironmentVariables): string;
}
