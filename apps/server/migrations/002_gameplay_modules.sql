ALTER TABLE user_wallets
  ADD COLUMN IF NOT EXISTS black_ash bigint NOT NULL DEFAULT 0 CHECK (black_ash >= 0);

CREATE TABLE card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element varchar(16) NOT NULL CHECK (element IN ('FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK')),
  grade varchar(16) NOT NULL CHECK (grade IN ('NORMAL', 'MAGIC', 'RARE', 'SUPER_RARE', 'UNIQUE', 'LEGENDARY')),
  name varchar(80) NOT NULL,
  image_key varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (element, grade)
);

INSERT INTO card_templates (element, grade, name, image_key)
SELECT element, grade,
  initcap(lower(element)) || ' ' || replace(initcap(lower(grade)), '_', ' '),
  'cards/' || lower(element) || '/' || lower(grade) || '.webp'
FROM unnest(ARRAY['FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK']::text[]) AS elements(element)
CROSS JOIN unnest(ARRAY['NORMAL', 'MAGIC', 'RARE', 'SUPER_RARE', 'UNIQUE', 'LEGENDARY']::text[]) AS grades(grade)
ON CONFLICT (element, grade) DO NOTHING;

CREATE TABLE user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES card_templates(id),
  enhancement_level smallint NOT NULL DEFAULT 0 CHECK (enhancement_level BETWEEN 0 AND 10),
  status varchar(16) NOT NULL DEFAULT 'OWNED' CHECK (status IN ('OWNED', 'DESTROYED', 'SOLD')),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_cards_owner_idx ON user_cards(user_id, status, acquired_at DESC);

CREATE TABLE idempotency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope varchar(32) NOT NULL,
  request_id varchar(80) NOT NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, request_id)
);

CREATE TABLE pack_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id varchar(80) NOT NULL,
  pack_type varchar(16) NOT NULL CHECK (pack_type IN ('FREE', 'AD')),
  probability_version varchar(32) NOT NULL,
  user_card_id uuid NOT NULL REFERENCES user_cards(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);

CREATE INDEX pack_openings_daily_idx ON pack_openings(user_id, pack_type, opened_at DESC);

CREATE TABLE enhancement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_card_id uuid NOT NULL REFERENCES user_cards(id),
  request_id varchar(80) NOT NULL,
  before_level smallint NOT NULL,
  after_level smallint,
  result varchar(16) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE', 'DESTROYED')),
  probability_version varchar(32) NOT NULL,
  coin_cost bigint NOT NULL CHECK (coin_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);

CREATE TABLE currency_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency_type varchar(32) NOT NULL CHECK (currency_type IN ('ARCANA_COIN', 'ENHANCEMENT_CRYSTAL', 'BLACK_ASH')),
  amount_delta bigint NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  reason varchar(48) NOT NULL,
  reference_id uuid,
  request_id varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency_type, request_id, reason)
);

CREATE TABLE point_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id varchar(80) NOT NULL,
  crystal_amount bigint NOT NULL CHECK (crystal_amount > 0),
  point_amount integer NOT NULL CHECK (point_amount > 0),
  status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);

CREATE INDEX point_exchanges_daily_idx ON point_exchanges(user_id, created_at DESC);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(64) NOT NULL,
  request_id varchar(80),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_user_time_idx ON audit_events(user_id, created_at DESC);
