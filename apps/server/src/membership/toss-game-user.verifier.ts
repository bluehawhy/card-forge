import { readFile } from 'node:fs/promises';
import { request } from 'node:https';
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import type { TossGameUserVerifier } from './membership.types';

@Injectable()
export class HttpTossGameUserVerifier implements TossGameUserVerifier {
  constructor(@Inject(SERVER_CONFIG) private readonly config: ServerConfig) {}

  async verify(tossGameUserHash: string): Promise<{ stableUserKey: string }> {
    const [cert, key, ca] = await Promise.all([
      readFile(this.config.tossMtlsCertPath),
      readFile(this.config.tossMtlsKeyPath),
      readFile(this.config.tossMtlsCaPath),
    ]);
    const response = await postJson(
      this.config.tossVerifyUrl,
      { tossGameUserHash },
      { cert, key, ca },
    );
    if (!isVerificationResponse(response))
      throw new Error('Invalid Toss verification response.');
    return { stableUserKey: response.userKey };
  }
}

function postJson(
  url: string,
  body: unknown,
  tls: { cert: Buffer; key: Buffer; ca: Buffer },
): Promise<unknown> {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'POST',
        cert: tls.cert,
        key: tls.key,
        ca: tls.ca,
        rejectUnauthorized: true,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 5_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          if (
            !res.statusCode ||
            res.statusCode < 200 ||
            res.statusCode >= 300
          ) {
            reject(
              new Error(`Toss verification failed (${res.statusCode ?? 0}).`),
            );
            return;
          }
          try {
            resolve(
              JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown,
            );
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on('timeout', () =>
      req.destroy(new Error('Toss verification timed out.')),
    );
    req.on('error', reject);
    req.end(payload);
  });
}

function isVerificationResponse(value: unknown): value is { userKey: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'userKey' in value &&
    typeof value.userKey === 'string' &&
    value.userKey.trim().length > 0
  );
}
