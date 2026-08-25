# Card Forge (Cards in Toss) - System Architecture & Code Structure Specification

> **Base Date:** August 25, 2026  
> **Reference Document:** 6 Elements Card Enhancement Point Game Proposal v1.0  
> **Tech Stack:** React + TypeScript + Vite (Client) / Node.js + NestJS (Server) / PostgreSQL + Redis (Database)

---

## 1. System Architecture Overview

This project is designed as a **Monorepo / Shared Modules** architecture consisting of a **WebView-based React Client for Apps in Toss**, a **NestJS Backend Server**, and **Shared Type Definitions**.

- **Client (`apps/client`)**: Responsible for UI/UX rendering, TDS (Toss Design System) components, Framer Motion animations, and Toss Rewarded Ads SDK integration.
- **Server (`apps/server`)**: Handles server-authoritative RNG logic (enhancement, destruction, card pack opening), PostgreSQL transactions, Toss Point API processing, and anti-fraud verification.
- **Shared (`shared`)**: Manages common DTOs, Enums, and TypeScript Interfaces shared between Client and Server.

---

## 2. Directory Structure Tree

```text
root/
├── apps/
│   ├── client/                       # [Client] React + TypeScript + Vite (Apps in Toss WebView)
│   │   ├── public/                   # Static assets
│   │   │   ├── audio/                # Sound effects (enhancement, destruction, pack opening)
│   │   │   └── images/               # Card illustrations, backgrounds by element & rarity
│   │   │
│   │   ├── src/
│   │   │   ├── assets/               # CSS bundles, icons, fonts
│   │   │   ├── components/           # UI Components (based on Toss Design System - TDS)
│   │   │   │   ├── common/           # Common buttons, modals, headers, tabs
│   │   │   │   ├── cards/            # Card frames, 2.5D parallax effect, hologram components
│   │   │   │   ├── enhance/          # Forge UI, enhancement/destruction animation effects
│   │   │   │   ├── packs/            # Pack opening sequence (with rewarded ads integration)
│   │   │   │   └── exchange/         # Crystal-to-Point exchange UI & daily limit gauge
│   │   │   │
│   │   │   ├── hooks/                # Custom React Hooks
│   │   │   │   ├── useTossAds.ts     # Apps in Toss Rewarded Ads SDK hook (load/reward callbacks)
│   │   │   │   ├── useTossLogin.ts   # Apps in Toss authentication hook
│   │   │   │   └── useEnhance.ts     # Enhancement API request & result handler hook
│   │   │   │
│   │   │   ├── pages/                # Screen Routes
│   │   │   │   ├── Home/             # / (Daily free pack, ad packs, crystal balance, daily limit)
│   │   │   │   ├── Packs/            # /packs (Card pack store & opening)
│   │   │   │   ├── Cards/            # /cards (Inventory - filter, sell, dismantle, enhance)
│   │   │   │   ├── CardDetail/       # /cards/:cardId (Card detail & Forge)
│   │   │   │   ├── Sell/             # /sell (Card selling booth)
│   │   │   │   ├── Exchange/         # /exchange (Crystal to Point exchange center)
│   │   │   │   ├── Collection/       # /collection (6 Elements × 6 Rarities Codex)
│   │   │   │   ├── Missions/         # /missions (Daily, Weekly, Season quests)
│   │   │   │   └── History/          # /history (Point & Crystal transaction ledger)
│   │   │   │
│   │   │   ├── stores/               # Zustand (Local UI state management)
│   │   │   │   ├── useUserStore.ts   # User currencies, remaining pack limits
│   │   │   │   └── useCardStore.ts   # Filter selections & active card selection state
│   │   │   │
│   │   │   ├── services/             # TanStack Query / API Services
│   │   │   │   ├── api.ts            # Axios / Fetch base module (Auto Idempotency-Key header)
│   │   │   │   ├── cardApi.ts        # Pack opening, ownership, enhancement, selling requests
│   │   │   │   └── exchangeApi.ts    # Crystal redemption & Toss Point claim API calls
│   │   │   │
│   │   │   ├── utils/                # Formatters, validators, unit converters
│   │   │   ├── router.tsx            # Route definitions
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   │
│   │   ├── package.json
│   │   └── vite.config.ts            # Vite configuration
│   │
│   └── server/                       # [Backend] Node.js + NestJS (Server-authoritative API)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # Toss User ID 1:1 mapping authentication module
│       │   │   │   ├── auth.controller.ts
│       │   │   │   └── auth.service.ts
│       │   │   │
│       │   │   ├── ads/              # Rewarded ad callback & nonce verification module
│       │   │   │   ├── ads.controller.ts
│       │   │   │   └── ads.service.ts
│       │   │   │
│       │   │   ├── pack/             # Card pack grant & probability-based card draw module
│       │   │   │   ├── pack.controller.ts
│       │   │   │   └── pack.service.ts
│       │   │   │
│       │   │   ├── enhance/          # Enhancement, destruction & server RNG module
│       │   │   │   ├── enhance.controller.ts
│       │   │   │   ├── enhance.service.ts # Server RNG calculation, 'Dark Ashes' grant on destruction
│       │   │   │   └── enhance-rate.config.ts # +1 to +10 rate table definitions (Version controlled)
│       │   │   │
│       │   │   ├── sell/             # Card selling & 'Crystals of Enhancement' accumulation module
│       │   │   │   ├── sell.controller.ts
│       │   │   │   └── sell.service.ts   # Tiered crystal reward calculation (+10 -> 30,000 Crystals)
│       │   │   │
│       │   │   ├── exchange/         # 3,000 Crystals -> 1P conversion & Daily limit ledger module
│       │   │   │   ├── exchange.controller.ts
│       │   │   │   ├── exchange.service.ts # Daily cap (3P/5P/10P) & rollover logic
│       │   │   │   └── toss-point.sdk.ts  # Apps in Toss Point payout SDK wrapper (Secret key secured)
│       │   │   │
│       │   │   ├── collection/       # 6 Elements × 6 Rarities Codex & highest level tracker
│       │   │   │   ├── collection.controller.ts
│       │   │   │   └── collection.service.ts
│       │   │   │
│       │   │   └── fraud-detection/  # Abuse detection & delayed review audit logging module
│       │   │       ├── fraud.service.ts   # Rapid enhancement speed & multi-account detection
│       │   │       └── audit-logger.ts    # Immutable ledger & transaction history logger
│       │   │
│       │   ├── common/
│       │   │   ├── guards/           # Auth & anti-abuse rate limiting guards
│       │   │   ├── interceptors/     # Idempotency Key & database transaction interceptors
│       │   │   └── constants/        # Fixed exchange rate constants (3,000 Crystals = 1P)
│       │   │
│       │   ├── database/             # PostgreSQL transactions & Redis concurrency lock
│       │   │   ├── entities/         # ORM entities (User, Card, Ledger, Quest, etc.)
│       │   │   └── redis.provider.ts # Distributed locks for duplicate request protection
│       │   │
│       │   ├── app.module.ts
│       │   └── main.ts
│       │
│       ├── package.json
│       └── tsconfig.json
│
└── shared/                           # Shared TypeScript Types (Client & Server)
    └── types/
        ├── card.ts                   # 6 Elements, 6 Rarities, Card Object Interfaces
        ├── enhance.ts                # Success/Fail/Destruction Enums & Request/Response DTOs
        ├── exchange.ts               # Crystal-to-Point exchange DTOs
        └── pack.ts                   # Card pack configuration types
```

---

## 3. Key Module Implementation Guidelines

### 3.1. Enhancement & Server RNG Module (`apps/server/src/modules/enhance`)
- **Server Authority**: Enhancement outcomes (Success, Maintain, Destruction) are calculated **strictly on the backend server** using Cryptographically Secure PRNG.
- **Destruction Residuals**: When card destruction occurs, the card is permanently deleted from inventory while 'Dark Ashes' material is granted in the same DB transaction.
- **Version Control**: The rate table (`enhance-rate.config.ts`) is version-tracked so that every transaction log records the exact rate table version applied at calculation time.

### 3.2. Ledger & Point Exchange Module (`apps/server/src/modules/exchange`)
- **Fixed Exchange Rate**: The conversion formula `3,000 Crystals of Enhancement = 1 Toss Point` is enforced as an immutable system constant.
- **Daily Cap & Rollover**: Excess crystals beyond the daily payout cap (initially 3P/day) are never burned or expired; they remain safely stored in the user's database balance for future claims.
- **Idempotency Guarantee**: Exchange endpoints require an `Idempotency-Key` header combined with Redis distributed locks to prevent duplicate point payouts from rapid double-tapping or network retries.

### 3.3. Fraud Detection & Audit Logging (`apps/server/src/modules/fraud-detection`)
- Monitors anomalous user activity (e.g., bot-like enhancement speed, multi-account device switching) mapped 1:1 to Toss User Identifiers.
- All financial transactions and reward redemptions pass through `audit-logger.ts` for immutable audit trails.
