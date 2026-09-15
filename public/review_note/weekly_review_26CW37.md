# 📅 개발 주간 리뷰 노트

**기간:** 2026-09-06 ~ 2026-09-12  
**참여자:** 개발자 A, 개발자 B

---

# 📌 저번 주 작업 진행

## 👨‍💻 개발자 A (`bluehawhy`)

- 카드 보관함을 최대 5장 기준으로 정리하고, 보유 카드가 가득 찬 경우 카드 뽑기를 차단하도록 개선
- 카드 뽑기 결과에 DB 카드 이미지와 공통 카드 UI를 연결하고, 보관함 바로가기 및 가득 참 안내 추가
- 강화소와 교환소의 카드 이미지·이름·등급 테두리·강화 단계를 동일한 스타일로 통일
- 강화 시 모루 타격 효과를 3회 재생한 뒤 결과를 공개하고, 실패 카드는 Android·iOS·웹에서 회색으로 표시
- 10강 카드 테두리에 금색 오로라 효과를 추가하고, 강화소 카드 5장을 한 줄로 축소 배치
- 광고 결과를 테스트할 수 있는 DEV 선택 UI를 추가하고 카드 뽑기·강화·판매 흐름에 보상 성공 여부를 반영
- 카드 뽑기 광고 시작 시점부터 1분 쿨다운을 적용하고, 중복 요청 방지를 위한 서버 예약 및 로컬 상태 동기화 구현
- 카드 판매의 광고 완료 인증은 제거하고, 결정→포인트 교환에는 mTLS 준비 상태 확인을 필수 적용
- Apps in Toss 사용자 해시·실행 환경·닉네임을 화면과 캐시에 연동하고 앱 내부 디버그 로그 화면 추가
- Supabase Storage 기반 카드 이미지·SVG 메뉴 아이콘 연결 및 이미지 중복 업로드 방지 동기화 스크립트 추가
- 설정 및 캐릭터 꾸미기 화면, 신규 카드 일러스트와 메뉴 아이콘을 추가하고 홈 화면 구성을 개선
- Supabase 데이터베이스 구조·카드 36종 정보·서버 구성 문서를 정리하고 GitHub Actions AIT 빌드 추가

## 👨‍💻 개발자 B (`9barcode`)

- Railway 배포 빌드에 PostgreSQL 마이그레이션 SQL을 포함하고, 구현 내용과 배포 절차를 리뷰 문서로 정리
- 로컬 게임 상태 캐시와 서버 확정형 동기화 흐름을 구축하고 카드 선택 판매·자유 강화 규칙 반영
- Supabase 서버 기반, 초기 데이터베이스 스키마 및 `users`·`cards`·`user_cards` 3개 테이블 구조 정렬
- Apps in Toss 사용자 식별을 이용한 Supabase 회원 세션 API와 클라이언트 인증 초기화 흐름 구현
- Supabase 보관함 조회 및 Storage 이미지 경로 규칙을 구현해 서버 카드 데이터를 클라이언트에 연결
- 카드팩 뽑기 API와 캐시 반영 흐름을 연결하고, 서버가 확정한 뽑기 결과를 화면에 표시하도록 개선
- 카드 강화 API와 클라이언트 강화 흐름을 연결해 성공·실패 결과와 보유 카드 상태를 서버 기준으로 갱신
- 개별 카드 판매 API를 Supabase 캐시 흐름에 연결하고 판매 후 결정 및 카드 상태 동기화 구현
- 공식 보상형 테스트 광고를 로컬 게임 흐름에 연결하고, 검증된 광고 ID 우선 사용·폴백·오류 표시 추가
- mTLS 적용 전에도 기존 사용자를 초기화할 수 있도록 회원 생성 흐름을 보완

---

# 🎯 이번 주 작업 목표

## 👨‍💻 개발자 A

- [ ] 
- [ ] 
- [ ] 

## 👨‍💻 개발자 B (`9barcode`)

- [ ] 
- [ ] 
- [ ] 

---

# 🔧 주요 코드 변경

## 👨‍💻 개발자 A

### 카드 화면 및 공통 UI

`pages/index.tsx`, `pages/card-storage.tsx`, `pages/packs.tsx`, `pages/forge.tsx`, `pages/exchange.tsx`, `pages/setting.tsx`, `src/components/card.tsx`, `src/components/card-picker.tsx`, `src/components/max-level-aura.tsx`, `assets/sytle/*.style.ts`

**변경 내용**

- 보관함·뽑기·강화·교환 화면의 카드 이미지, 이름, 등급 테두리와 강화 단계 표시를 공통 스타일로 통일
- 강화 타격 애니메이션, 실패 카드 저채도 표시, 10강 금색 오로라 및 강화소 5장 한 줄 배치 구현
- 카드 5장 보유 시 뽑기 제한과 안내 문구, 보관함 이동 버튼 및 설정·캐릭터 꾸미기 화면 추가

---

### 광고 및 클라이언트 게임 상태

`src/components/dev-rewarded-ad-toggle.tsx`, `src/services/rewardedAdService.ts`, `src/features/game-cache/*`, `src/features/user/*`, `src/services/userService.ts`, `src/utils/appLogger.ts`, `pages/debug-logs.tsx`

**변경 내용**

- DEV 광고 결과 선택과 보상 성공 판정, 광고 시작 기준 1분 쿨다운 및 중복 요청 방지 상태 연결
- 사용자 해시·환경·닉네임을 게임 캐시와 동기화하고 앱 내부 세션 로그 조회 기능 추가
- 카드 뽑기·강화·판매 결과를 서버 응답과 캐시에 반영하도록 게이트웨이와 서비스 보완

---

### Supabase API 정책 및 마이그레이션

`apps/server/supabase/functions/game-api/packs.ts`, `apps/server/supabase/functions/game-api/enhancements.ts`, `apps/server/supabase/functions/game-api/sales.ts`, `apps/server/supabase/functions/game-api/membership.ts`, `apps/server/supabase/migrations/*.sql`

**변경 내용**

- 카드 뽑기 광고 예약·쿨다운과 판매 결과 시간 형식 보완
- 뽑기·강화·판매의 광고 완료 증명 의존성을 제거하고, 결정→포인트 교환의 mTLS 준비 확인 유지
- 사용자 해시와 프로필 필드, 결정 보유량 관련 스키마 및 문서 갱신

---

### 에셋·자동화·문서

`assets/images/cards/*`, `assets/images/icons/*`, `scripts/upload-images-to-supabase.ts`, `.github/workflows/build-ait.yml`, `public/docs/*`

**변경 내용**

- 신규 카드 일러스트와 SVG 메뉴 아이콘을 추가하고 Supabase Storage URL로 연결
- 중복 파일은 건너뛰는 Storage 이미지 동기화 명령과 GitHub Actions AIT 빌드 구성 추가
- 카드 36종, 데이터베이스 구조, 게임 규칙 및 서버 비용·배포 문서 정리

---

## 👨‍💻 개발자 B (`9barcode`)

### Railway 마이그레이션 배포

`apps/server/package.json`, `apps/server/scripts/copy-migrations.cjs`, `apps/server/src/database/migrations.ts`, `apps/server/README.md`

**변경 내용**

- 서버 빌드 산출물에 PostgreSQL 마이그레이션 SQL을 자동 포함하고 누락·빈 파일을 빌드 단계에서 차단
- Railway 사전 배포 마이그레이션 실행 방법과 검증 결과 문서화

---

### Supabase 기반 및 데이터베이스

`apps/server/supabase/config.toml`, `apps/server/supabase/.env.example`, `apps/server/supabase/migrations/*.sql`, `apps/server/supabase/functions/_shared/*`, `apps/server/supabase/README.md`

**변경 내용**

- Supabase Edge Functions 실행 기반과 공통 DB·HTTP·암호화 모듈 구성
- 회원, 보관함, 카드팩, 강화, 판매를 위한 스키마와 단계별 마이그레이션 추가
- 프로젝트 DB를 `users`·`cards`·`user_cards` 중심의 3개 테이블 구조로 정렬

---

### 서버 게임 API

`apps/server/supabase/functions/game-api/membership.ts`, `apps/server/supabase/functions/game-api/inventory.ts`, `apps/server/supabase/functions/game-api/packs.ts`, `apps/server/supabase/functions/game-api/enhancements.ts`, `apps/server/supabase/functions/game-api/sales.ts`, `apps/server/supabase/functions/game-api/*-domain.ts`

**변경 내용**

- 사용자 세션 초기화와 보관함 조회 API 구현
- 카드팩 뽑기, 카드 강화 및 개별 카드 판매를 서버 확정형 트랜잭션으로 구현
- Storage 카드 이미지 경로와 카드·결정 변경 결과를 API 응답에 반영

---

### 클라이언트 캐시 및 서버 연동

`src/features/game-cache/*`, `src/features/user/*`, `src/services/userService.ts`, `pages/index.tsx`, `pages/card-storage.tsx`, `pages/packs.tsx`, `pages/forge.tsx`, `pages/exchange.tsx`

**변경 내용**

- 인증 사용자 초기화 후 서버 게임 상태를 로컬 캐시에 적재하는 부트스트랩 흐름 구현
- 보관함·뽑기·강화·판매 요청을 HTTP 게이트웨이에 연결하고 서버 결과로 화면과 캐시 갱신
- 네트워크 전환을 고려한 로컬 테스트 게이트웨이와 화면 표시 모델 보완

---

### 보상형 광고 및 테스트

`src/services/rewardedAdService.ts`, `test/client/unit/rewarded-ad-service.test.ts`, `test/client/unit/http-game-server-gateway.test.ts`, `test/server/unit/*`

**변경 내용**

- 공식 테스트 광고 ID와 로컬 게임 동작을 연결하고 광고 ID 폴백 및 SDK 오류 표시 추가
- 회원·보관함·카드팩·강화·판매 도메인과 클라이언트 게이트웨이 단위 테스트 보강

---

# 🔍 리뷰 의견

## 👨‍💻 개발자 A 의견

- 

## 👨‍💻 개발자 B (`9barcode`) 의견

- 

---

# 🐛 문제점

### 문제 1

**내용**

- 

**관련 파일**

`파일명`

**현재 상태**

- ⬜ 확인 필요
- 🟡 수정 중
- 🟢 해결 완료

---

# 🧠 논의 및 결정 사항

## 논의 1. 제목

### 논의 내용

- 

### 의견

**개발자 A**

- 

**개발자 B**

- 

### 최종 결정

> 

### 결정 이유

- 

---

# 📌 다음 주 확인 사항

- [ ] 
- [ ] 
- [ ] 
