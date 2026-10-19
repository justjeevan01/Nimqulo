ALTER TABLE nimqulo_conversations
  ADD COLUMN IF NOT EXISTS avatar_media_id text REFERENCES nimqulo_media(id) ON DELETE SET NULL;
