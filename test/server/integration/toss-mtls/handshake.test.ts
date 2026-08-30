import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { type Server, createServer } from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TLSSocket } from 'node:tls';
import type { ServerConfig } from '../../../../apps/server/src/config';
import { HttpTossGameUserVerifier } from '../../../../apps/server/src/membership/toss-game-user.verifier';
import {
  NodeTossMtlsHttpClient,
  TossMtlsConfigurationError,
  validateClientCredentials,
} from '../../../../apps/server/src/toss/toss-mtls-client';

jest.setTimeout(30_000);

describe('Toss mTLS integration', () => {
  let fixtureDirectory: string;
  let server: Server;

  beforeAll(async () => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), 'card-forge-mtls-'));
    await createCertificates(fixtureDirectory);
  });

  afterEach(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  afterAll(async () => {
    await rm(fixtureDirectory, { recursive: true, force: true });
  });

  it('실제 TLS handshake에서 클라이언트 인증서를 검증하고 hash 원문을 본문에 넣지 않는다', async () => {
    const ca = await readFile(join(fixtureDirectory, 'ca.crt'));
    const serverCert = await readFile(join(fixtureDirectory, 'server.crt'));
    const serverKey = await readFile(join(fixtureDirectory, 'server.key'));
    const receivedBodies: string[] = [];

    server = createServer(
      {
        ca,
        cert: serverCert,
        key: serverKey,
        requestCert: true,
        rejectUnauthorized: true,
      },
      (request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          receivedBodies.push(Buffer.concat(chunks).toString('utf8'));
          expect((request.socket as TLSSocket).authorized).toBe(true);
          expect(request.headers['x-anon-key']).toBe(
            'verified-game-user-hash-value',
          );
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(
            JSON.stringify({ resultType: 'SUCCESS', success: 'true' }),
          );
        });
      },
    );
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = server.address() as AddressInfo;
    const verifyUrl = `https://127.0.0.1:${port}/api-partner/v1/apps-in-toss/users/anon-key/verify`;
    const config: ServerConfig = {
      port: 3000,
      databaseUrl: 'postgres://unused',
      sessionPepper: 'a-secure-test-pepper-with-more-than-32-characters',
      sessionTtlSeconds: 3600,
      tossApiBaseUrl: `https://127.0.0.1:${port}`,
      tossVerifyUrl: verifyUrl,
      tossMtlsCertPath: join(fixtureDirectory, 'client.crt'),
      tossMtlsKeyPath: join(fixtureDirectory, 'client.key'),
      tossMtlsCaPath: join(fixtureDirectory, 'ca.crt'),
      tossRequestTimeoutMs: 2_000,
      tossRequestMaxRetries: 0,
    };
    const client = new NodeTossMtlsHttpClient(config);
    const verifier = new HttpTossGameUserVerifier(config, client);

    await expect(client.checkReadiness()).resolves.toEqual({
      ready: true,
      expiresAt: expect.any(String),
    });
    await expect(
      verifier.verify('verified-game-user-hash-value'),
    ).resolves.toEqual({ stableUserKey: 'verified-game-user-hash-value' });
    expect(receivedBodies).toEqual(['']);
    client.close();
  });

  it('인증서와 개인키가 서로 다르면 준비 상태를 거절한다', async () => {
    const config: ServerConfig = {
      port: 3000,
      databaseUrl: 'postgres://unused',
      sessionPepper: 'a-secure-test-pepper-with-more-than-32-characters',
      sessionTtlSeconds: 3600,
      tossApiBaseUrl: 'https://apps-in-toss-api.toss.im',
      tossVerifyUrl:
        'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/users/anon-key/verify',
      tossMtlsCertPath: join(fixtureDirectory, 'client.crt'),
      tossMtlsKeyPath: join(fixtureDirectory, 'server.key'),
    };
    const client = new NodeTossMtlsHttpClient(config);

    await expect(client.checkReadiness()).rejects.toBeInstanceOf(
      TossMtlsConfigurationError,
    );
  });

  it('유효기간이 지난 인증서는 거절한다', async () => {
    const cert = await readFile(join(fixtureDirectory, 'client.crt'));
    const key = await readFile(join(fixtureDirectory, 'client.key'));

    expect(() =>
      validateClientCredentials(cert, key, new Date('2100-01-01T00:00:00Z')),
    ).toThrow(TossMtlsConfigurationError);
  });
});

async function createCertificates(directory: string): Promise<void> {
  const openssl = findOpenSsl();
  run(openssl, directory, [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'ca.key',
    '-out',
    'ca.crt',
    '-subj',
    '/CN=Card Forge Test CA',
    '-days',
    '1',
    '-sha256',
  ]);
  run(openssl, directory, [
    'req',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'server.key',
    '-out',
    'server.csr',
    '-subj',
    '/CN=127.0.0.1',
  ]);
  await writeFile(
    join(directory, 'server.ext'),
    'subjectAltName=IP:127.0.0.1\nextendedKeyUsage=serverAuth\n',
  );
  run(openssl, directory, [
    'x509',
    '-req',
    '-in',
    'server.csr',
    '-CA',
    'ca.crt',
    '-CAkey',
    'ca.key',
    '-CAcreateserial',
    '-out',
    'server.crt',
    '-days',
    '1',
    '-sha256',
    '-extfile',
    'server.ext',
  ]);
  run(openssl, directory, [
    'req',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'client.key',
    '-out',
    'client.csr',
    '-subj',
    '/CN=Card Forge Test Client',
  ]);
  await writeFile(
    join(directory, 'client.ext'),
    'extendedKeyUsage=clientAuth\n',
  );
  run(openssl, directory, [
    'x509',
    '-req',
    '-in',
    'client.csr',
    '-CA',
    'ca.crt',
    '-CAkey',
    'ca.key',
    '-CAcreateserial',
    '-out',
    'client.crt',
    '-days',
    '1',
    '-sha256',
    '-extfile',
    'client.ext',
  ]);
}

function findOpenSsl(): string {
  if (process.platform !== 'win32') return 'openssl';
  return 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';
}

function run(openssl: string, directory: string, args: string[]): void {
  execFileSync(openssl, args, { cwd: directory, stdio: 'ignore' });
}
