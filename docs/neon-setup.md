# Neon backend setup

The app is linked to Neon project `divine-bonus-12105648` in organization `org-red-resonance-88595204`, branch `production`, region `aws-ap-southeast-1`. Infrastructure is declared in `neon.ts`: Postgres, the private `assets` bucket, and the `api` function. Clerk remains the identity provider; Neon Auth, Data API, AI Gateway, and Realtime are not provisioned by this config.

## What is connected

- Settings appearance/notification preferences load from and save to Postgres through the API. Appearance persists the selection; this does not add light-mode styling or notification delivery.
- Create Group's existing photo picker uploads raster images through the API into private object storage. The API stores owner, object key, type, and size in Postgres and returns a one-hour signed read URL. This is an initial media integration; group records and conversations remain the existing local placeholders, and signed image URLs need refreshing for longer-lived group persistence.
- Every data/media endpoint verifies the Clerk token signature, issuer, expiry, session claim, and web origin when present, then reads admin approval from Clerk's Backend API. Resource ownership comes from the verified token, never a request-supplied user ID. Images belonging to another user return 404.
- The mobile/web app sends Clerk session tokens to the public API URL. Database, S3, and Clerk secret credentials stay in the backend. The release browser bundle was checked for secret values.

Neon Functions use Node.js 24. A small module-level `pg` pool is shared across requests and registered with `attachDatabasePool`; Drizzle defines the tables and queries. The Files SDK's Neon adapter reads the injected S3 environment variables. Server code is under `backend/`, outside Expo Router and the client import tree.

## Environment and deployment

Keep `.env` and `.neon` untracked. `.env.example` lists names only. `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_URL` are public client configuration. `CLERK_SECRET_KEY`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `AWS_*` credentials must never receive the `EXPO_PUBLIC_` prefix.

`CLERK_ISSUER_URL` is the HTTPS frontend API origin for the existing Clerk instance. Set `APP_ORIGINS` to the allowed web origins and app scheme before deploying a new web hostname. The current defaults cover local ports 8081, 8082, 19006, and `triplyai://`.

```powershell
neon login
npm run backend:deploy
neon functions get api -o json | node scripts/neon-client-env.cjs
npm run db:migrate
npm run build
npm run android
```

`backend:deploy` calls `neon deploy --env .env`, provisions the config, and pulls Neon-managed variables into `.env`. The URL helper copies only `invocation_url` into `EXPO_PUBLIC_API_URL`. Restart Metro after changing client environment variables. `npm run backend:dev` runs the function locally using the linked branch's resources.

Migrations live in `backend/migrations`, run transactionally with an advisory lock and migration ledger, and use the direct connection. Migration 001 was applied successfully on the temporary `nimqulo-setup-validation` branch before production. That isolated validation branch was created with a one-hour expiry. CLI context remains production.

## Validation

`npm run build` runs TypeScript, exports the Expo web app, then builds the Node backend artifact into `dist/backend/index.mjs`. The order preserves the backend artifact after Expo prepares `dist`. `npm test` includes backend approval, ownership, CORS, payload limit, and Clerk signature/issuer/expiry/origin checks alongside the existing app tests.

For live checks, set `BACKEND_TEST_USER_ID` locally to an approved account with an existing active app session and run `npm run backend:smoke`. The script uses the local server-only Clerk secret to mint fresh tokens for that existing session; it does not create users, change approval, or store tokens. Alternatively supply `BACKEND_TEST_TOKEN` locally as a short-lived session JWT. This uses the actual shared app API client to save/read preferences, upload/download an image, verify matching SHA-256 bytes and Postgres media metadata, then remove the test image and restore preferences. It also tests health and unauthenticated rejection. Tokens must remain local and are not printed. An optional `BACKEND_OTHER_TOKEN` enables the live second-account isolation check; without it, that check is explicitly reported as untested. Unit tests cover two-user isolation.

The initial OAuth attempt timed out; signing in again succeeded. Deployment initially hit an environment-dependent config evaluation error while deriving the Clerk issuer inline; an explicit issuer environment variable fixed it. An initially missing build tool was installed. Final build, typecheck, lint, 15 tests, deployed service checks, secret-bundle checks, Android preference persistence across app reload, and an actual Android photo-picker upload passed. Test preferences were restored and test objects/metadata were removed. The app was left on Home with the placeholder chats and plus button. Dependency audit reports 28 findings (8 moderate, 20 high); broad dependency upgrades were not applied as part of infrastructure setup.
