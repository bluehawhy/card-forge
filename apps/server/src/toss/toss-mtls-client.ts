import { X509Certificate, createPrivateKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Agent, request } from 'node:https';
import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { SERVER_CONFIG, type ServerConfig } from '../config';

const MAX_RESPONSE_BYTES = 1024 * 1024;

export const TOSS_MTLS_HTTP_CLIENT = Symbol('TOSS_MTLS_HTTP_CLIENT');

export interface TossMtlsRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface TossMtlsHttpClient {
  requestJson<T>(request: TossMtlsRequest): Promise<T>;
  checkReadiness(): Promise<TossMtlsReadiness>;
  close(): void;
}

export interface TossMtlsReadiness {
  ready: true;
  expiresAt: string;
}

export class TossMtlsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TossMtlsConfigurationError';
  }
}

export class TossMtlsRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'TossMtlsRequestError';
  }
}

@Injectable()
export class NodeTossMtlsHttpClient
  implements TossMtlsHttpClient, OnModuleInit, OnApplicationShutdown
{
  private readonly baseOrigin: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private credentialPromise?: Promise<ValidatedCredential>;
  private agent?: Agent;

  constructor(@Inject(SERVER_CONFIG) private readonly config: ServerConfig) {
    this.baseOrigin = new URL(
      config.tossApiBaseUrl ?? new URL(config.tossVerifyUrl).origin,
    ).origin;
    this.timeoutMs = config.tossRequestTimeoutMs ?? 5_000;
    this.maxRetries = config.tossRequestMaxRetries ?? 1;
  }

  async requestJson<T>(input: TossMtlsRequest): Promise<T> {
    const url = new URL(input.url);
    if (url.protocol !== 'https:' || url.origin !== this.baseOrigin) {
      throw new TossMtlsConfigurationError(
        'Toss API request must use the configured HTTPS origin.',
      );
    }

    let attempt = 0;
    while (true) {
      try {
        return await this.requestOnce<T>(url, input);
      } catch (error) {
        if (attempt >= this.maxRetries || !isRetryable(error)) throw error;
        attempt += 1;
        await delay(50 * 2 ** (attempt - 1));
      }
    }
  }

  async checkReadiness(): Promise<TossMtlsReadiness> {
    const credential = await this.getCredential();
    return {
      ready: true,
      expiresAt: credential.expiresAt.toISOString(),
    };
  }

  async onModuleInit(): Promise<void> {
    await this.checkReadiness();
  }

  close(): void {
    this.agent?.destroy();
  }

  onApplicationShutdown(): void {
    this.close();
  }

  private async requestOnce<T>(url: URL, input: TossMtlsRequest): Promise<T> {
    const { agent } = await this.getCredential();
    const payload =
      input.body === undefined ? undefined : JSON.stringify(input.body);

    return new Promise<T>((resolve, reject) => {
      const req = request(
        url,
        {
          agent,
          method: input.method,
          headers: {
            Accept: 'application/json',
            ...(payload === undefined
              ? {}
              : {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(payload).toString(),
                }),
            ...input.headers,
          },
          timeout: this.timeoutMs,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let receivedBytes = 0;

          response.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
            if (receivedBytes > MAX_RESPONSE_BYTES) {
              req.destroy(
                new TossMtlsRequestError('Toss API response is too large.'),
              );
              return;
            }
            chunks.push(chunk);
          });
          response.on('end', () => {
            const statusCode = response.statusCode ?? 0;
            if (statusCode < 200 || statusCode >= 300) {
              reject(
                new TossMtlsRequestError(
                  `Toss API request failed with status ${statusCode}.`,
                  statusCode,
                ),
              );
              return;
            }
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
            } catch {
              reject(
                new TossMtlsRequestError('Toss API returned invalid JSON.'),
              );
            }
          });
        },
      );

      req.on('timeout', () => {
        const error = new TossMtlsRequestError('Toss API request timed out.');
        Object.assign(error, { code: 'ETIMEDOUT' });
        req.destroy(error);
      });
      req.on('error', reject);
      req.end(payload);
    });
  }

  private async getCredential(): Promise<ValidatedCredential> {
    this.credentialPromise ??= this.createCredential();
    const credential = await this.credentialPromise;
    if (new Date() >= credential.expiresAt) {
      throw new TossMtlsConfigurationError(
        'Toss mTLS certificate is not currently valid.',
      );
    }
    return credential;
  }

  private async createCredential(): Promise<ValidatedCredential> {
    try {
      const [cert, key, ca] = await Promise.all([
        readRequiredFile(this.config.tossMtlsCertPath),
        readRequiredFile(this.config.tossMtlsKeyPath),
        this.config.tossMtlsCaPath
          ? readRequiredFile(this.config.tossMtlsCaPath)
          : Promise.resolve(undefined),
      ]);
      const { expiresAt } = validateClientCredentials(cert, key);
      const agent = new Agent({
        cert,
        key,
        ...(ca ? { ca } : {}),
        keepAlive: true,
        maxSockets: 20,
        rejectUnauthorized: true,
      });
      this.agent = agent;
      return { agent, expiresAt };
    } catch {
      throw new TossMtlsConfigurationError(
        'Toss mTLS credentials are missing, invalid, expired, or mismatched.',
      );
    }
  }
}

interface ValidatedCredential {
  agent: Agent;
  expiresAt: Date;
}

export function validateClientCredentials(
  cert: Buffer,
  key: Buffer,
  now = new Date(),
): { expiresAt: Date } {
  const certificate = new X509Certificate(cert);
  const privateKey = createPrivateKey(key);
  const validFrom = new Date(certificate.validFrom);
  const expiresAt = new Date(certificate.validTo);

  if (
    Number.isNaN(validFrom.getTime()) ||
    Number.isNaN(expiresAt.getTime()) ||
    now < validFrom ||
    now >= expiresAt
  ) {
    throw new TossMtlsConfigurationError(
      'Toss mTLS certificate is not currently valid.',
    );
  }
  if (!certificate.checkPrivateKey(privateKey)) {
    throw new TossMtlsConfigurationError(
      'Toss mTLS certificate and private key do not match.',
    );
  }
  return { expiresAt };
}

async function readRequiredFile(path: string): Promise<Buffer> {
  const value = await readFile(path);
  if (value.length === 0) throw new Error('Empty mTLS file.');
  return value;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof TossMtlsRequestError && error.statusCode !== undefined) {
    return (
      error.statusCode === 408 ||
      error.statusCode === 429 ||
      error.statusCode >= 500
    );
  }
  if (!(error instanceof Error) || !('code' in error)) return false;
  return [
    'ECONNRESET',
    'ETIMEDOUT',
    'EPIPE',
    'EAI_AGAIN',
    'ENETUNREACH',
  ].includes(String(error.code));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
