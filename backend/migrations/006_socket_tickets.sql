CREATE TABLE IF NOT EXISTS nimqulo_socket_tickets (
  hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  session_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
