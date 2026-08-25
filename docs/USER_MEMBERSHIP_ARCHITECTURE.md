# 회원 기능 구조 설명서

> 구현 브랜치: `feature/user-membership`  
> 대상 앱: Apps in Toss 게임 미니앱 · Granite React Native · TypeScript

## 1. 구현 목적

카드, 강화, 광고 보상, 결정, 포인트 교환 기록을 동일한 게임 사용자에게 안전하게 연결할 수 있도록 회원 기능의 기본 구조를 먼저 만든다.

이메일·비밀번호 회원가입은 사용하지 않는다. 게임 실행 시 앱인토스의 `getUserKeyForGame()`으로 게임별 고유 식별키를 받은 뒤 회원 서버가 기존 회원을 조회하거나 신규 회원을 자동 생성한다.

## 2. 실행 흐름

```text
게임 실행
  → initializeCurrentUser()
  → getUserKeyForGame()
  → tossGameUserHash 획득
  → POST /api/v1/user-sessions
  → 서버가 기존 회원 조회 또는 신규 회원 생성
  → UserSession 반환
  → 이후 /api/v1/users/me 요청에 accessToken 사용
```

샌드박스에서는 `getUserKeyForGame()`이 mock hash를 반환한다. 실제 토스 앱에서는 동일 미니앱과 동일 사용자 조합에 대해 고유한 hash가 반환된다.

## 3. 실제 디렉터리 구조

```text
src/
├── features/user/
│   ├── domain/
│   │   ├── user.ts
│   │   └── userError.ts
│   ├── ports/
│   │   ├── gameUserIdentityProvider.ts
│   │   └── userRepository.ts
│   ├── infrastructure/
│   │   ├── appsInTossGameUserIdentityProvider.ts
│   │   ├── httpUserRepository.ts
│   │   └── *.test.ts
│   └── index.ts
└── services/
    ├── userService.ts
    └── userService.test.ts
```

## 4. 파일별 책임

### `domain/user.ts`

회원 기능에서 사용하는 정확한 데이터 형식을 정의한다.

- `CurrentUserProfile`: 현재 회원의 공개 가능한 기본 정보
- `UserSession`: 서버 access token, 회원 정보, 신규 가입 여부
- `UpdateCurrentUserProfileInput`: 닉네임 변경 입력값
- `UserAccountStatus`: `ACTIVE | SUSPENDED | WITHDRAWN`

게임 재화와 카드 정보는 회원 기본정보에 섞지 않는다. 이후 `user_wallets`, `user_cards`, `currency_ledger` 도메인에서 별도로 관리한다.

### `ports/gameUserIdentityProvider.ts`

게임 사용자 식별키를 얻는 방법의 규격이다. 화면과 서비스는 앱인토스 SDK를 직접 호출하지 않고 이 규격만 사용한다. 테스트 또는 다른 실행환경에서는 동일 규격의 가짜 구현을 주입할 수 있다.

### `ports/userRepository.ts`

회원 서버가 제공해야 하는 작업의 규격이다.

| 함수 | 파라미터 | 반환값 | 역할 |
|---|---|---|---|
| `initializeUserSession` | `tossGameUserHash: string` | `Promise<UserSession>` | 기존 회원 조회 또는 신규 자동 생성 |
| `getCurrentUser` | `accessToken: string` | `Promise<CurrentUserProfile>` | 현재 로그인 회원 조회 |
| `updateCurrentUserProfile` | `accessToken`, `profileInput` | `Promise<CurrentUserProfile>` | 현재 회원 프로필 변경 |

임의 `userId`를 받아 다른 회원을 조회하는 함수는 일반 사용자 앱에 제공하지 않는다.

### `infrastructure/appsInTossGameUserIdentityProvider.ts`

React Native용 `@apps-in-toss/framework`의 `getUserKeyForGame()`을 호출한다. 지원하지 않는 앱 버전, 잘못된 미니앱 카테고리, SDK 오류, 비정상 응답을 각각 구분한다.

### `infrastructure/httpUserRepository.ts`

회원 서버와 JSON을 주고받는 실제 HTTP 구현이다. API 주소와 `fetch` 구현을 외부에서 받기 때문에 운영 서버, 개발 서버, 자동 테스트에서 같은 코드를 재사용할 수 있다.

### `services/userService.ts`

화면에서 사용하는 회원 기능의 단일 진입점이다.

| 함수 | 파라미터 | 반환값 | 역할 |
|---|---|---|---|
| `initializeCurrentUser` | 없음 | `Promise<UserSession>` | 식별키 획득부터 회원 자동 생성까지 수행 |
| `getCurrentUser` | 없음 | `Promise<CurrentUserProfile>` | 초기화된 현재 회원 조회 |
| `updateCurrentUserDisplayName` | `displayName: string` | `Promise<CurrentUserProfile>` | 2~12자 닉네임 검증 후 변경 |
| `clearCurrentUserSession` | 없음 | `void` | 메모리에 보관한 현재 세션 제거 |

동시에 `initializeCurrentUser()`가 여러 번 호출돼도 서버 초기화 요청은 한 번만 전송한다.

## 5. 다른 개발자의 사용 방법

앱 구성 지점에서 의존성을 한 번 조립한다.

```ts
import {
  createAppsInTossGameUserIdentityProvider,
  createHttpUserRepository,
  createUserService,
} from './features/user';

const gameUserIdentityProvider = createAppsInTossGameUserIdentityProvider();
const userRepository = createHttpUserRepository({
  apiBaseUrl: 'https://개발-회원서버-주소',
});

export const userService = createUserService({
  gameUserIdentityProvider,
  userRepository,
});
```

게임 시작 화면에서는 다음을 호출한다.

```ts
const currentUserSession = await userService.initializeCurrentUser();
```

백엔드가 준비되기 전에는 `GameUserIdentityProvider`와 `UserRepository` 인터페이스를 구현한 mock 객체를 넣어 카드·강화 화면을 병렬 개발한다.

## 6. 서버 API 계약

### 회원 세션 초기화

```http
POST /api/v1/user-sessions
Content-Type: application/json
```

```json
{
  "tossGameUserHash": "앱인토스에서_발급받은_hash"
}
```

서버 처리 순서:

1. 앱인토스 서버의 식별키 검증 API를 mTLS로 호출한다.
2. 검증된 hash 원문을 애플리케이션 로그에 남기지 않는다.
3. 기존 회원이면 마지막 접속 시각을 갱신한다.
4. 회원이 없으면 사용자와 기본 지갑을 하나의 DB 트랜잭션으로 생성한다.
5. 앱 세션용 access token과 회원 정보를 반환한다.
6. 동일 hash의 동시 요청에도 회원이 하나만 생기도록 DB unique constraint를 적용한다.

응답:

```json
{
  "accessToken": "게임_서버_세션_토큰",
  "user": {
    "userId": "내부_UUID",
    "displayName": "초보 대장장이",
    "accountStatus": "ACTIVE",
    "createdAt": "2026-08-26T00:00:00.000Z",
    "lastSignedInAt": "2026-08-26T00:00:00.000Z"
  },
  "isNewUser": true
}
```

### 내 정보 조회

```http
GET /api/v1/users/me
Authorization: Bearer 게임_서버_세션_토큰
```

### 내 정보 변경

```http
PATCH /api/v1/users/me
Authorization: Bearer 게임_서버_세션_토큰
Content-Type: application/json
```

```json
{
  "displayName": "불의 장인"
}
```

## 7. 현재 구현 범위와 다음 작업

이번 구현에 포함된 것:

- 앱인토스 게임 사용자 hash 획득
- 기존 회원 조회·신규 자동 생성을 위한 클라이언트 API
- 내 정보 조회와 닉네임 변경
- 중복 초기화 요청 방지
- 회원 오류 코드 표준화
- 서버와 공유할 명확한 TypeScript 타입
- 단위 테스트

아직 포함되지 않은 것:

- NestJS 회원 API와 PostgreSQL 테이블
- 서버의 앱인토스 식별키 mTLS 검증
- access token의 안전한 영구 저장
- React 전역 UserProvider 또는 Zustand 연결
- 회원 탈퇴 UI와 운영 정책

백엔드 저장소 또는 서버 패키지가 추가되면 이 문서의 API 계약에 맞춰 구현한다. 클라이언트 함수명과 응답 타입을 변경하지 않으면 카드·강화 기능과 충돌 없이 병렬 개발할 수 있다.
