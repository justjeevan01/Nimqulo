CREATE TABLE nimqulo_accounts (
  user_id text PRIMARY KEY,
  approved boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleting','deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE nimqulo_devices (
  user_id text PRIMARY KEY REFERENCES nimqulo_accounts(user_id),
  session_id text NOT NULL,
  session_started bigint NOT NULL,
  device_id uuid NOT NULL,
  push_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX nimqulo_push_token ON nimqulo_devices(push_token) WHERE push_token IS NOT NULL;
CREATE TABLE nimqulo_connections (
  id uuid PRIMARY KEY,
  low_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  high_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  requester_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  status text NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (low_id,high_id), CHECK (low_id < high_id),
  CHECK (requester_id IN (low_id, high_id))
);
CREATE TABLE nimqulo_conversations (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('direct','group')),
  name text,
  direct_pair text UNIQUE,
  next_seq bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind='direct' AND direct_pair IS NOT NULL) OR (kind='group' AND name IS NOT NULL))
);
CREATE TABLE nimqulo_memberships (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES nimqulo_conversations(id),
  user_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  role text NOT NULL CHECK (role IN ('Owner','Admin','Member')),
  start_seq bigint NOT NULL,
  end_seq bigint,
  joined_at timestamptz NOT NULL DEFAULT now(),
  read_seq bigint NOT NULL DEFAULT 0,
  CHECK (end_seq IS NULL OR end_seq >= start_seq-1)
);
CREATE UNIQUE INDEX nimqulo_current_member ON nimqulo_memberships(conversation_id,user_id) WHERE end_seq IS NULL;
CREATE UNIQUE INDEX nimqulo_group_owner ON nimqulo_memberships(conversation_id) WHERE role='Owner' AND end_seq IS NULL;
CREATE INDEX nimqulo_member_user ON nimqulo_memberships(user_id,conversation_id) WHERE end_seq IS NULL;
CREATE TABLE nimqulo_invitations (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES nimqulo_conversations(id),
  inviter_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  recipient_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  status text NOT NULL CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX nimqulo_pending_invitation ON nimqulo_invitations(conversation_id,recipient_id) WHERE status='pending';
CREATE INDEX nimqulo_invitation_recipient ON nimqulo_invitations(recipient_id,status);
CREATE TABLE nimqulo_messages (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES nimqulo_conversations(id),
  author_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  retry_id uuid NOT NULL,
  seq bigint NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  UNIQUE(conversation_id,seq), UNIQUE(author_id,retry_id),
  CHECK ((deleted AND body IS NULL) OR (NOT deleted AND char_length(btrim(body)) BETWEEN 1 AND 4000))
);
CREATE TABLE nimqulo_blocks (
  owner_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  target_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  PRIMARY KEY(owner_id,target_id), CHECK(owner_id<>target_id)
);
CREATE TABLE nimqulo_reports (
  id uuid PRIMARY KEY,
  reporter_id text REFERENCES nimqulo_accounts(user_id),
  target_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE nimqulo_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  conversation_id uuid REFERENCES nimqulo_conversations(id),
  message_id uuid REFERENCES nimqulo_messages(id),
  kind text NOT NULL,
  realtime_done boolean NOT NULL DEFAULT false,
  push_done boolean NOT NULL DEFAULT false,
  push_ticket text,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nimqulo_events_user ON nimqulo_events(user_id,id);
CREATE INDEX nimqulo_events_pending ON nimqulo_events(available_at,id) WHERE NOT realtime_done OR NOT push_done;
CREATE TABLE nimqulo_deletions (
  user_id text PRIMARY KEY REFERENCES nimqulo_accounts(user_id),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE nimqulo_rate_limits (
  user_id text NOT NULL,
  bucket bigint NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id,bucket)
);
CREATE TABLE nimqulo_socket_tickets (
  hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES nimqulo_accounts(user_id),
  session_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
