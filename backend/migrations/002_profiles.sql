CREATE TABLE nimqulo_profiles (
  user_id text PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 60 AND display_name !~ '[[:cntrl:]]'),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION nimqulo_keep_username() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Profile identity is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER nimqulo_profile_identity BEFORE UPDATE ON nimqulo_profiles
FOR EACH ROW EXECUTE FUNCTION nimqulo_keep_username();
