# Card Forge membership server

회원 식별과 세션 발급을 담당하는 NestJS/PostgreSQL 서버 패키지다. 게임 결과·재화·포인트는 이후 서버 모듈에서도 동일한 서버 권한 원칙과 원장 트랜잭션을 사용한다.

## 시작 순서

1. `.env.example`의 값을 운영 비밀 저장소에 등록한다.
2. `migrations/001_user_membership.sql`을 PostgreSQL에 적용한다.
3. Toss 검증 API용 mTLS 인증서·키 파일을 읽기 전용 secret으로 마운트한다.
   운영체제 기본 CA 대신 별도 CA가 필요한 환경에서만 `TOSS_MTLS_CA_PATH`를 설정한다.
4. 루트에서 `npm run server:build`, `npm run server:test`로 검증한다.

서버는 hash·access token 원문을 DB에 저장하거나 로그에 남기지 않는다. Toss 검증 결과는 HMAC digest로, 세션 token은 SHA-256 digest로만 저장한다.

## Toss mTLS 환경변수

- `TOSS_MTLS_CERT_PATH`: 콘솔에서 내려받은 클라이언트 인증서의 secret mount 경로
- `TOSS_MTLS_KEY_PATH`: 콘솔에서 내려받은 개인키의 secret mount 경로
- `TOSS_MTLS_CA_PATH`: 선택값. 사설 CA 또는 로컬 통합 테스트에서만 사용
- `TOSS_API_BASE_URL`: 기본값 `https://apps-in-toss-api.toss.im`
- `TOSS_GAME_VERIFY_URL`: 기본값은 공식 anon-key 검증 endpoint
- `TOSS_REQUEST_TIMEOUT_MS`: 기본 5000ms, 허용 범위 100~30000ms
- `TOSS_REQUEST_MAX_RETRIES`: 기본 1회, 허용 범위 0~3회

인증서와 개인키는 저장소·이미지·로그에 넣지 않는다. 배포 플랫폼의 Secret에 저장하고 파일로 마운트한다. mTLS 클라이언트는 인증서 파일을 최초 요청 때 한 번만 읽고, Toss 공식 origin 밖으로는 요청하지 않으며, 오류 메시지에 응답 본문·hash·인증서 경로를 포함하지 않는다.

## API

- `POST /api/v1/user-sessions`: `{ tossGameUserHash }`를 mTLS로 검증하고 회원/지갑을 하나의 트랜잭션으로 생성한 뒤 1시간 opaque token을 발급한다.
- `GET /api/v1/users/me`: 활성·미만료 Bearer token의 현재 회원을 반환한다.
- `PATCH /api/v1/users/me`: 활성 세션의 닉네임을 NFC 정규화 후 변경한다.
- `DELETE /api/v1/user-sessions/current`: 현재 opaque session을 즉시 폐기한다.

정지·탈퇴·만료·폐기 세션은 조회 쿼리에서 거절한다. 토큰은 짧은 수명으로 유지하며 만료 후 클라이언트가 Toss 식별 절차를 다시 수행한다. 운영 단계에서는 rate limit을 추가한다.
