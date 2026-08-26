CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_game_user_digest text NOT NULL UNIQUE,
  display_name varchar(36) NOT NULL,
  account_status varchar(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'WITHDRAWN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_signed_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_wallets (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  arcana_coin bigint NOT NULL DEFAULT 0 CHECK (arcana_coin >= 0),
  enhancement_crystal bigint NOT NULL DEFAULT 0 CHECK (enhancement_crystal >= 0),
  version bigint NOT NULL DEFAULT 0
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_sessions_active_idx
  ON user_sessions(token_digest, expires_at)
  WHERE revoked_at IS NULL;
