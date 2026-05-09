CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  creator_name TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  price_lamports BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_earned BIGINT DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_wallet TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  tx_signature TEXT UNIQUE NOT NULL,
  fan_text TEXT NOT NULL,
  audio_url TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','completed','refunded','rejected')),
  amount_lamports BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_creator_wallet
  ON purchases(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_purchases_tx_signature
  ON purchases(tx_signature);
CREATE INDEX IF NOT EXISTS idx_creators_wallet_address
  ON creators(wallet_address);
