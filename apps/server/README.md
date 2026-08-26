# Card Forge membership server

회원 식별과 세션 발급을 담당하는 NestJS/PostgreSQL 서버 패키지다. 게임 결과·재화·포인트는 이후 서버 모듈에서도 동일한 서버 권한 원칙과 원장 트랜잭션을 사용한다.

## 시작 순서

1. `.env.example`의 값을 운영 비밀 저장소에 등록한다.
2. `migrations/001_user_membership.sql`을 PostgreSQL에 적용한다.
3. Toss 검증 API용 mTLS 인증서·키·CA 파일을 읽기 전용 secret으로 마운트한다.
4. 루트에서 `npm run server:build`, `npm run server:test`로 검증한다.

서버는 hash·access token 원문을 DB에 저장하거나 로그에 남기지 않는다. Toss 검증 결과는 HMAC digest로, 세션 token은 SHA-256 digest로만 저장한다.

## API

- `POST /api/v1/user-sessions`: `{ tossGameUserHash }`를 mTLS로 검증하고 회원/지갑을 하나의 트랜잭션으로 생성한 뒤 1시간 opaque token을 발급한다.
- `GET /api/v1/users/me`: 활성·미만료 Bearer token의 현재 회원을 반환한다.
- `PATCH /api/v1/users/me`: 활성 세션의 닉네임을 NFC 정규화 후 변경한다.
- `DELETE /api/v1/user-sessions/current`: 현재 opaque session을 즉시 폐기한다.

정지·탈퇴·만료·폐기 세션은 조회 쿼리에서 거절한다. 토큰은 짧은 수명으로 유지하며 만료 후 클라이언트가 Toss 식별 절차를 다시 수행한다. 운영 단계에서는 rate limit을 추가한다.
