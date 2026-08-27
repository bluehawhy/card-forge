-- Card Forge rules v2 foundation. Apply after 001 and 002.
-- Historical v1 rows are preserved; new writes default to the v2 rule version.

ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS rules_version varchar(40) NOT NULL DEFAULT 'card-forge-rules-v1';

UPDATE user_cards SET enhancement_level = 1 WHERE enhancement_level = 0;
UPDATE user_cards SET status = 'ENHANCEABLE' WHERE status = 'OWNED';

ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_enhancement_level_check;
ALTER TABLE user_cards
  ADD CONSTRAINT user_cards_enhancement_level_v2_check
  CHECK (enhancement_level BETWEEN 1 AND 10);

ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_status_check;
ALTER TABLE user_cards
  ADD CONSTRAINT user_cards_status_v2_check
  CHECK (status IN ('ENHANCEABLE', 'ENHANCEMENT_LOCKED', 'MAX_LEVEL', 'DESTROYED', 'SOLD'));

ALTER TABLE user_cards ALTER COLUMN enhancement_level SET DEFAULT 1;
ALTER TABLE user_cards ALTER COLUMN status SET DEFAULT 'ENHANCEABLE';
ALTER TABLE user_cards ALTER COLUMN rules_version SET DEFAULT 'card-forge-rules-v2';

CREATE TABLE ad_reward_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completion_id varchar(160) NOT NULL UNIQUE,
  purpose varchar(24) NOT NULL CHECK (purpose IN ('PACK', 'ENHANCEMENT', 'SALE')),
  status varchar(16) NOT NULL DEFAULT 'VERIFIED' CHECK (status IN ('VERIFIED', 'CONSUMED', 'REJECTED')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  request_id varchar(80),
  UNIQUE (user_id, purpose, request_id)
);

CREATE INDEX ad_reward_receipts_user_time_idx
  ON ad_reward_receipts(user_id, verified_at DESC);

CREATE TABLE daily_forge_climates (
  climate_date date PRIMARY KEY,
  climate varchar(16) NOT NULL CHECK (climate IN ('CLEAR', 'CLOUDY', 'RAIN', 'STRONG_WIND', 'HEATWAVE', 'YELLOW_DUST')),
  bonus_element varchar(16) NOT NULL CHECK (bonus_element IN ('FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK')),
  bag_cycle uuid NOT NULL,
  bag_position smallint NOT NULL CHECK (bag_position BETWEEN 0 AND 5),
  rules_version varchar(40) NOT NULL DEFAULT 'card-forge-rules-v2',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE card_sale_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id varchar(80) NOT NULL,
  ad_receipt_id uuid NOT NULL REFERENCES ad_reward_receipts(id),
  climate_date date NOT NULL REFERENCES daily_forge_climates(climate_date),
  climate_bonus_applied boolean NOT NULL DEFAULT false,
  crystal_reward bigint NOT NULL CHECK (crystal_reward > 0),
  rules_version varchar(40) NOT NULL DEFAULT 'card-forge-rules-v2',
  sold_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);

CREATE TABLE card_sale_batch_items (
  sale_batch_id uuid NOT NULL REFERENCES card_sale_batches(id) ON DELETE CASCADE,
  user_card_id uuid NOT NULL REFERENCES user_cards(id),
  base_value bigint NOT NULL CHECK (base_value > 0),
  enhancement_level smallint NOT NULL CHECK (enhancement_level BETWEEN 1 AND 10),
  element_multiplier numeric(3,2) NOT NULL CHECK (element_multiplier IN (1.00, 1.50)),
  crystal_reward bigint NOT NULL CHECK (crystal_reward > 0),
  PRIMARY KEY (sale_batch_id, user_card_id),
  UNIQUE (user_card_id)
);

CREATE TABLE daily_sale_bonuses (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_date date NOT NULL,
  sale_batch_id uuid NOT NULL UNIQUE REFERENCES card_sale_batches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, bonus_date)
);

ALTER TABLE pack_openings
  ADD COLUMN IF NOT EXISTS ad_receipt_id uuid REFERENCES ad_reward_receipts(id);

ALTER TABLE enhancement_logs
  ADD COLUMN IF NOT EXISTS ad_receipt_id uuid REFERENCES ad_reward_receipts(id);
