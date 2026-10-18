ALTER TABLE nimqulo_messages ADD COLUMN reply_to_id uuid REFERENCES nimqulo_messages(id);
CREATE INDEX nimqulo_message_reply ON nimqulo_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
