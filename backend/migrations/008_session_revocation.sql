ALTER TABLE nimqulo_devices ADD COLUMN revoked boolean NOT NULL DEFAULT false;
ALTER TABLE nimqulo_accounts ADD COLUMN avatar_key text;
