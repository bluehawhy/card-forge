# Card Forge 서버 구성 추천

## 목적

Apps in Toss 기반 `card-forge`에서 사용자 정보, 카드 보유 정보, 재화, 거래 기록 등의 데이터를 저장하기 위한 백엔드 구성을 검토한다.

초기 단계에서는 **운영 비용을 최대한 낮추고**, 사용자가 증가했을 때 자연스럽게 확장할 수 있는 구성을 우선한다.

## 추천 서비스 비교

| 구성 | 예상 초기 비용 | 장점 | 단점 | 추천 |
|---|---:|---|---|---|
| **Cloudflare Workers + D1** | **0원** | 서버 관리 불필요, API + DB 구성 가능, 무료 구간이 큼 | API를 직접 작성해야 함 | ⭐⭐⭐⭐⭐ |
| **Supabase** | **0원** | PostgreSQL, Auth, Storage, REST API 제공 | 무료 프로젝트 제약 존재 | ⭐⭐⭐⭐ |
| Firebase | **0원부터** | 모바일 친화적이고 관련 자료가 많음 | 규모가 커질수록 비용 계산이 복잡할 수 있음 | ⭐⭐⭐ |
| VPS / EC2 | 월 수천~수만원 | 자유도가 높음 | 서버 관리 필요, 사용자가 없어도 비용 발생 | ⭐⭐ |

## 1순위: Cloudflare Workers + D1

현재 `card-forge` 단계에서는 **Cloudflare Workers + D1** 구성을 우선 추천한다.

```text
Apps in Toss
     │
     │ HTTPS
     ▼
Cloudflare Workers
    API 서버
     │
     ├── 유저 정보
     ├── 카드 보유 정보
     ├── 재화
     ├── 카드 뽑기
     ├── 카드 합성
     └── 거래 기록
     │
     ▼
Cloudflare D1
 SQLite Database
```

별도의 Linux 서버를 운영할 필요가 없고, Worker를 TypeScript로 작성할 수 있기 때문에 현재 `card-forge`의 TypeScript 기반 개발 환경과도 잘 맞는다.

또한 서버가 단순히 실행 중이라는 이유로 VPS처럼 고정 서버비가 발생하지 않아 초기 운영비를 매우 낮게 유지할 수 있다.

### Cloudflare 무료 구간 참고

Cloudflare Workers 무료 플랜은 하루 기준 상당한 요청량을 처리할 수 있으며, D1 역시 무료 플랜에서 읽기/쓰기 및 저장공간 무료 구간을 제공한다.

초기 서비스에서 예를 들어 사용자 1,000명이 하루에 API를 평균 30회 호출한다고 가정하면:

```text
1,000명 × 30회
= 30,000 API 요청 / day
```

정도이므로 초기 서비스 규모에서는 무료 구간으로 운영할 가능성이 높다.

> 무료 한도와 가격 정책은 변경될 수 있으므로 실제 출시 시점에는 Cloudflare 공식 Pricing 문서를 다시 확인한다.

## 데이터베이스 예시

D1에는 다음과 같은 형태로 게임 데이터를 저장할 수 있다.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    toss_user_key TEXT UNIQUE,
    nickname TEXT,
    crystal INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rarity TEXT,
    attack INTEGER,
    defense INTEGER
);

CREATE TABLE user_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    level INTEGER DEFAULT 1,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (card_id) REFERENCES cards(id)
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## API 구성 예시

클라이언트에서 D1 데이터베이스에 직접 접근하지 않고 반드시 Worker API를 통해 접근한다.

```text
GET  /api/user
GET  /api/cards
GET  /api/cards/:id

POST /api/card/draw
POST /api/card/forge
POST /api/reward
POST /api/exchange
```

React Native에서는 일반적인 HTTPS API 형태로 호출한다.

```ts
const response = await fetch('https://api.card-forge.com/api/user');
const user = await response.json();
```

특히 카드 뽑기 결과, 재화 증가/차감, 합성 결과처럼 조작되면 안 되는 게임 로직은 클라이언트가 아니라 서버에서 처리하는 것이 좋다.

## 2순위: Supabase

백엔드 개발 편의성을 더 중요하게 생각한다면 Supabase도 좋은 선택이다.

```text
Apps in Toss
     │
     ▼
Backend / API
     │
     ▼
Supabase
 ├── PostgreSQL
 ├── Auth
 ├── Storage
 └── REST API
```

Supabase는 PostgreSQL 기반이기 때문에 다음과 같이 관계형 데이터가 많은 게임 구조를 다루기 편하다.

```text
User
 └── Card
      └── Inventory
           └── Transaction
```

관리 UI와 PostgreSQL, 인증, Storage 등의 기능을 한 번에 사용할 수 있다는 점은 Cloudflare D1보다 편리하다.

반면 `card-forge`처럼 초기 비용 최소화가 가장 중요한 프로젝트에서는 Cloudflare Workers + D1 쪽이 더 단순한 선택이 될 수 있다.

## Apps in Toss 연동 시 주의사항

게임 데이터 저장 자체는 Worker API + D1 구조로 충분하지만 향후 다음과 같은 Apps in Toss 기능을 사용하면 서버 요구사항을 별도로 확인해야 한다.

- 토스 로그인
- 토스페이
- 인앱결제
- 메시지 발송
- 프로모션 관련 서버 API

이러한 기능 중 일부는 파트너 서버와 Apps in Toss 서버 사이의 서버 통신 및 mTLS 인증을 요구할 수 있다.

따라서 클라이언트에서 토스 서버 API를 직접 호출하는 구조가 아니라 다음과 같은 형태가 되어야 한다.

```text
card-forge
Apps in Toss Client
       │
       ▼
Backend API
       │
       ├── D1 / Supabase
       │
       └── Apps in Toss Server API
              ▲
              │
             mTLS
```

Cloudflare Workers를 사용할 경우 실제 적용하려는 Apps in Toss 서버 API의 mTLS 요구사항을 Worker 환경에서 만족할 수 있는지 반드시 확인해야 한다.

## 단계별 추천 구조

### 초기 개발 / 출시

```text
Apps in Toss
       │
       ▼
Cloudflare Workers
       │
       ▼
Cloudflare D1

예상 서버 비용: 0원에 가깝게 시작
```

이 단계에서는 다음 데이터를 우선 서버화한다.

- 사용자 정보
- 재화
- 카드 목록
- 사용자 보유 카드
- 카드 뽑기 결과
- 카드 합성 결과
- 거래 기록

### 서비스 확장 이후

토스 로그인, 결제, 프로모션 등의 서버 API 연동이 본격적으로 필요해지면 다음 구조로 확장한다.

```text
Apps in Toss
       │
       ▼
Backend API
       │
       ├── Cloudflare D1 / Supabase
       │
       └── mTLS Server
              │
              ▼
       Apps in Toss API
```

## 최종 추천

현재 `card-forge`에서는 다음 구성을 우선 사용한다.

> **Cloudflare Workers + Cloudflare D1**

선택 이유:

1. 초기 서버 비용을 거의 0원으로 유지할 수 있다.
2. 별도 VPS/Linux 서버 관리가 필요 없다.
3. TypeScript로 API 서버를 개발할 수 있다.
4. 현재 `card-forge` 프로젝트의 TypeScript 개발 환경과 잘 맞는다.
5. 사용자 증가에 따라 점진적으로 확장할 수 있다.

백엔드 관리 편의성이나 PostgreSQL 기능이 더 중요해지는 시점에는 Supabase를 대안으로 검토한다.

## 다음 구현 단계

Cloudflare 구성을 선택할 경우 다음 순서로 진행한다.

```text
1. Cloudflare Worker 프로젝트 생성
        ↓
2. D1 Database 생성
        ↓
3. users / cards / user_cards / transactions 테이블 생성
        ↓
4. Worker에 REST API 구현
        ↓
5. card-forge에서 API Client 구현
        ↓
6. 사용자/카드/재화 데이터 서버 저장
        ↓
7. 카드 뽑기/합성 로직 서버 이전
```

초기에는 구조를 복잡하게 만들지 않고 위 구성으로 시작한 뒤, 실제 사용자 수와 기능 요구사항에 맞춰 확장한다.
