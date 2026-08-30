# Card Forge 테스트 안내

모든 테스트는 저장소 루트의 `test/`에서 관리한다. 제품 코드와 테스트 코드를 분리해 `src/`, `apps/server/src/`의 테스트 파일이 운영 빌드에 포함되지 않게 한다.

## 폴더 분류

- `client/unit`: 클라이언트 함수와 서비스를 독립적으로 검사한다. 외부 SDK와 HTTP는 모킹할 수 있다.
- `server/unit`: 서버 함수와 서비스를 독립적으로 검사한다. Repository 등 의존 객체는 모킹할 수 있다.
- `server/component`: 실제 Nest HTTP 요청 처리와 여러 내부 코드를 함께 검사하되 외부 저장소 등은 모킹한다. 실제 연동 테스트 성공으로 계산하지 않는다.
- `server/integration/postgres`: 로컬에서 실행 중인 실제 PostgreSQL에 연결한다. 인메모리 DB와 Repository 모킹을 금지한다.
- `server/integration/toss-mtls`: 로컬에서 실제 인증서와 HTTPS 서버를 사용해 TLS handshake를 검사한다. HTTP 또는 TLS 모킹을 금지한다.
- `helpers`: 여러 테스트가 함께 쓰는 준비·정리 도구를 둔다.
- `fixtures`: 테스트용 입력 데이터를 둔다. 실제 사용자 정보나 비밀키는 넣지 않는다.

## 실행 방법

```powershell
npm run test:client
npm run server:test
npm run server:test:component
npm run server:test:mtls
$env:TEST_DATABASE_URL='postgres://postgres:password@127.0.0.1:5432/card_forge_test'
npm run server:test:postgres
npm run server:test:all
Remove-Item Env:TEST_DATABASE_URL
```

`server:test:postgres`는 지정한 DB의 `public` 스키마를 초기화한다. 데이터베이스 이름은 반드시 `_test`로 끝나야 하며 운영 DB 주소를 `TEST_DATABASE_URL`로 지정하면 안 된다.

`server:test:all`은 서버 단위, 컴포넌트, 실제 TLS, 실제 PostgreSQL 테스트를 모두 실행한다. 실행 전에 `TEST_DATABASE_URL`을 설정해야 한다.

## 성공 결과를 해석하는 법

- 단위 테스트 성공: 작은 함수·서비스의 규칙이 예상대로 동작한다.
- 컴포넌트 테스트 성공: 서버의 HTTP 흐름이 동작하지만 외부 DB나 토스 서버까지 연결됐다는 뜻은 아니다.
- PostgreSQL 통합 테스트 성공: 실제 PostgreSQL 연결, 마이그레이션, 트랜잭션, 동시 요청 처리가 동작한다.
- mTLS 통합 테스트 성공: 인증서 기반 TLS 연결 구조가 동작한다. 토스 운영 서버 승인을 대신하지는 않는다.
