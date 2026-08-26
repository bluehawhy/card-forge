# 카드 대장간 (Card Forge)

Apps in Toss용 수집형 카드 강화 게임입니다. 현재 앱은 Granite React Native와 TypeScript로 개발하고 있습니다.

## 개발 문서

- [게임 기획서](docs/GAME_DESIGN.md)
- [게임 규칙서](docs/GAME_RULES.md)
- [전체 목표 구조 설계서](docs/카드대장간_설계서_한글.md)
- [회원 기능 실제 구현 구조](docs/USER_MEMBERSHIP_ARCHITECTURE.md)

## 서버

`apps/server`에는 NestJS/PostgreSQL 회원 서버가 포함되어 있습니다. Toss 게임 사용자 식별키는 mTLS로 검증하며, 회원과 기본 지갑을 하나의 트랜잭션으로 생성합니다.

```bash
npm run server:build
npm run server:test
```

## 검증 명령

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```
