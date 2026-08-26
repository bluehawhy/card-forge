export interface ServerConfig {
  port: number;
  databaseUrl: string;
  sessionPepper: string;
  sessionTtlSeconds: number;
  tossVerifyUrl: string;
  tossMtlsCertPath: string;
  tossMtlsKeyPath: string;
  tossMtlsCaPath: string;
}

export const SERVER_CONFIG = Symbol('SERVER_CONFIG');

export function loadServerConfig(environment = process.env): ServerConfig {
  const sessionPepper = requireValue(environment, 'SESSION_PEPPER');
  if (sessionPepper.length < 32) {
    throw new Error('SESSION_PEPPER must be at least 32 characters.');
  }

  const sessionTtlSeconds = Number(environment.SESSION_TTL_SECONDS ?? '3600');
  if (!Number.isInteger(sessionTtlSeconds) || sessionTtlSeconds < 60) {
    throw new Error('SESSION_TTL_SECONDS must be an integer of at least 60.');
  }

  return {
    port: Number(environment.PORT ?? '3000'),
    databaseUrl: requireValue(environment, 'DATABASE_URL'),
    sessionPepper,
    sessionTtlSeconds,
    tossVerifyUrl: requireHttpsUrl(environment, 'TOSS_GAME_VERIFY_URL'),
    tossMtlsCertPath: requireValue(environment, 'TOSS_MTLS_CERT_PATH'),
    tossMtlsKeyPath: requireValue(environment, 'TOSS_MTLS_KEY_PATH'),
    tossMtlsCaPath: requireValue(environment, 'TOSS_MTLS_CA_PATH'),
  };
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requireHttpsUrl(environment: NodeJS.ProcessEnv, name: string): string {
  const value = requireValue(environment, name);
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS.`);
  return parsed.toString();
}
