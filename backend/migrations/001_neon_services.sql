CREATE TABLE IF NOT EXISTS nimqulo_preferences (
  user_id text PRIMARY KEY,
  appearance text NOT NULL DEFAULT 'System' CHECK (appearance IN ('System', 'Dark', 'Light')),
  notifications boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nimqulo_media (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  size integer NOT NULL CHECK (size > 0 AND size <= 5242880),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nimqulo_media_owner ON nimqulo_media (owner_id);
