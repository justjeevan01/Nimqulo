CREATE TABLE nimqulo_chat_images (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES nimqulo_conversations(id),
  owner_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  retry_id uuid NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/webp')),
  size integer NOT NULL CHECK(size BETWEEN 1 AND 5242880),
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,retry_id)
);
ALTER TABLE nimqulo_messages ADD COLUMN image_id uuid REFERENCES nimqulo_chat_images(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX nimqulo_message_image ON nimqulo_messages(image_id) WHERE image_id IS NOT NULL;
ALTER TABLE nimqulo_messages DROP CONSTRAINT nimqulo_messages_check;
ALTER TABLE nimqulo_messages ADD CONSTRAINT nimqulo_messages_check CHECK (
  (deleted AND body IS NULL) OR
  (NOT deleted AND body IS NOT NULL AND char_length(body)<=4000 AND (char_length(btrim(body))>0 OR image_id IS NOT NULL))
);
