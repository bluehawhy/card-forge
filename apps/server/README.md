# Card Forge membership server

회원 식별과 세션 발급을 담당하는 NestJS/PostgreSQL 서버 패키지다. 게임 결과·재화·포인트는 이후 서버 모듈에서도 동일한 서버 권한 원칙과 원장 트랜잭션을 사용한다.

## 시작 순서

1. `.env.example`의 값을 운영 비밀 저장소에 등록한다.
2. `migrations/001_user_membership.sql`을 PostgreSQL에 적용한다.
3. Toss 검증 API용 mTLS 인증서·키 파일을 읽기 전용 secret으로 마운트한다.
   운영체제 기본 CA 대신 별도 CA가 필요한 환경에서만 `TOSS_MTLS_CA_PATH`를 설정한다.
4. 루트에서 `npm run server:build`, `npm run server:test`로 검증한다.

## PostgreSQL 마이그레이션과 실제 통합 테스트

빌드 후 `DATABASE_URL`을 설정하고 `npm run db:migrate --workspace @card-forge/server`를 실행한다. 적용된 SQL 파일과 SHA-256 checksum은 `schema_migrations`에 기록된다. 이미 적용된 파일이 수정되면 서버가 재적용하지 않고 오류로 중단한다.

실제 PostgreSQL 통합 테스트는 일반 Jest 테스트와 분리되어 있다. 테스트 전용 데이터베이스를 만들고 이름을 반드시 `_test`로 끝낸 뒤 다음 명령을 실행한다.

```powershell
$env:TEST_DATABASE_URL='postgres://card_forge:password@localhost:5432/card_forge_test'
npm run server:test:postgres
```

이 명령은 지정한 테스트 DB의 `public` 스키마를 초기화한다. 운영·개발 DB URL에는 실행할 수 없도록 데이터베이스 이름을 검사한다. 세 마이그레이션 재현, 36개 카드 템플릿, 회원·지갑·세션 원자적 생성, 오류 롤백, 동시 회원 초기화, 카드팩 멱등성을 실제 PostgreSQL에서 검증한다.

모든 테스트 파일과 테스트 분류 기준은 저장소 루트의 `test/`에 있다. `test/server/component`는 외부 저장소를 모킹하므로 실제 통합 성공으로 계산하지 않는다. 자세한 실행 방법은 `test/README.md`를 따른다.

서버는 hash·access token 원문을 DB에 저장하거나 로그에 남기지 않는다. Toss 검증 결과는 HMAC digest로, 세션 token은 SHA-256 digest로만 저장한다.

## Toss mTLS 환경변수

- `TOSS_MTLS_CERT_PATH`: 콘솔에서 내려받은 클라이언트 인증서의 secret mount 경로
- `TOSS_MTLS_KEY_PATH`: 콘솔에서 내려받은 개인키의 secret mount 경로
- `TOSS_MTLS_CA_PATH`: 선택값. 사설 CA 또는 로컬 통합 테스트에서만 사용
- `TOSS_API_BASE_URL`: 기본값 `https://apps-in-toss-api.toss.im`
- `TOSS_GAME_VERIFY_URL`: 기본값은 공식 anon-key 검증 endpoint
- `TOSS_REQUEST_TIMEOUT_MS`: 기본 5000ms, 허용 범위 100~30000ms
- `TOSS_REQUEST_MAX_RETRIES`: 기본 1회, 허용 범위 0~3회

인증서와 개인키는 저장소·이미지·로그에 넣지 않는다. 배포 플랫폼의 Secret에 저장하고 파일로 마운트한다. 서버는 시작할 때 인증서 파일을 읽고 유효기간과 인증서·개인키 일치 여부를 검사하며, 준비되지 않으면 기동에 실패한다. 실행 중 준비 상태를 확인할 때도 만료 여부를 다시 검사한다. Toss 공식 origin 밖으로는 요청하지 않으며, 오류 메시지에 응답 본문·hash·인증서 경로를 포함하지 않는다.

## API

- `GET /health/live`: 서버 프로세스가 응답 가능한지 확인한다. 외부 API는 호출하지 않는다.
- `GET /health/ready`: mTLS 인증서 파일, 유효기간, 개인키 일치 여부를 확인한다. 토스 API는 호출하지 않으며 실패 시 비밀 경로를 숨긴 503을 반환한다.

- `POST /api/v1/user-sessions`: `{ tossGameUserHash }`를 mTLS로 검증하고 회원/지갑을 하나의 트랜잭션으로 생성한 뒤 1시간 opaque token을 발급한다.
- `GET /api/v1/users/me`: 활성·미만료 Bearer token의 현재 회원을 반환한다.
- `PATCH /api/v1/users/me`: 활성 세션의 닉네임을 NFC 정규화 후 변경한다.
- `DELETE /api/v1/user-sessions/current`: 현재 opaque session을 즉시 폐기한다.

정지·탈퇴·만료·폐기 세션은 조회 쿼리에서 거절한다. 토큰은 짧은 수명으로 유지하며 만료 후 클라이언트가 Toss 식별 절차를 다시 수행한다. 운영 단계에서는 rate limit을 추가한다.

## V2 카드팩 확률 정책 — 처음 보는 사람을 위한 설명

카드팩 결과는 앱 화면이 아니라 서버가 결정한다. 사용자가 앱 코드를 바꿔서 레전더리 등급을 요청하더라도 서버는 그 값을 받지 않고 직접 다시 뽑기 때문에 조작을 막을 수 있다.

`src/packs/v2-pack-reward.policy.ts`는 0부터 9,999까지 총 10,000개의 번호 중 하나를 보안 난수로 뽑는다. 각 등급에 배정된 번호의 개수가 곧 확률이다.

| 등급 | 배정 번호 수 | 확률 |
|---|---:|---:|
| 노말 | 6,000 | 60% |
| 매직 | 3,313 | 33.13% |
| 레어 | 600 | 6% |
| 슈퍼레어 | 43 | 0.43% |
| 유니크 | 33 | 0.33% |
| 레전더리 | 11 | 0.11% |

합계는 10,000개, 즉 정확히 100%다. 불·물·땅·바람·빛·어둠 원소는 별도의 보안 난수로 뽑으며 여섯 원소가 같은 확률을 가진다.

NestJS는 `AppModule`을 보고 필요한 부품을 연결한다. `PACK_REWARD_POLICY`에는 더 이상 동작을 막는 임시 정책이 아니라 `V2PackRewardPolicy`가 연결된다. `PacksService`는 정책이 뽑은 등급·원소와 `card-forge-pack-v2` 버전을 PostgreSQL 저장소에 전달한다. 버전을 같이 저장하면 나중에 확률표가 바뀌어도 어떤 규칙으로 뽑았는지 추적할 수 있다.

확률을 변경할 때는 숫자 하나만 임의로 고치지 않는다. 새 정책 버전과 테스트를 함께 만들고, 모든 등급의 가중치 합계가 계속 10,000인지 확인해야 한다. 단위 테스트는 실제 난수를 믿고 반복하는 대신 각 등급의 시작·끝 경계값을 직접 주입하여 빠짐없이 검사한다.
