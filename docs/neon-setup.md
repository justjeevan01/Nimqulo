# Neon backend setup

Nimqulo uses Neon project `divine-bonus-12105648` in Singapore (`aws-ap-southeast-1`). Infrastructure in `neon.ts` declares Postgres, the private `assets` bucket, the HTTP API and scheduled delivery recovery. Firebase handles authentication; Neon Auth and Neon Realtime are not enabled. Cloudflare Durable Objects deliver live invalidations and typing events.

The existing `production` branch (`br-calm-frost-a1ndi9sf`) is the development environment. The separate `pilot` branch (`br-square-feather-a14064tt`) is the release environment. It was created schema-only: development profiles, chats, sessions and push tokens were not copied. Its database password and storage/coordinator credentials are separate.

## Connected services

- Postgres persists profiles, preferences, connections, groups, invitations, conversations, messages, read positions, blocks, reports and deletion/delivery jobs.
- Private object storage holds profile and chat photos. Uploads validate raster signatures and a 5 MB cap. Chat photos are bound to their conversation, uploader and retry identifier. Only authorized current members can resolve a published photo from their current membership period; removed members and blocked direct contacts cannot request it.
- The Node.js 24 API verifies Firebase tokens and current Google/admin approval independently of the mobile UI. Resource ownership comes from the verified identity. A module-level `pg` pool is registered with `attachDatabasePool`; Drizzle handles profile/preferences/media queries. The Files SDK uses Neon's injected S3 credentials.
- Signed photo URLs expire; message history stores photo IDs. The app resolves fresh URLs for display/opening. Failed uploads keep their local photo in the account-private directory for retry. Sign-out removes account caches.

## Environment

Keep `.env`, `.env.release`, `.neon` and service-account JSONs outside Git and the EAS upload. `EXPO_PUBLIC_API_URL` is public. `FIREBASE_ADMIN_CONFIG`, database/S3 credentials and `REALTIME_SERVICE_KEY` are server-only. Never expose them through an `EXPO_PUBLIC_` name.

```sh
node --env-file=.env.release scripts/migrate.cjs
neon deploy --env .env.release --branch pilot --project-id divine-bonus-12105648 --no-env-pull
node --env-file=.env.release scripts/push-realtime-secret.cjs --env pilot
```

Deploy the coordinator from `realtime` with `node node_modules/wrangler/bin/wrangler.js deploy --env pilot`. Its `API_URL` must match the isolated release API. Migrations use the direct connection, a ledger and a transaction lock. Test migrations on an isolated branch before deployment.

## Validation

`npm run build` typechecks, exports the Android application and builds `dist/backend/index.mjs`. `npm test` exercises access, authentication policy, ownership, payload limits and client behavior. `npm run test:realtime` checks coordinator authorization. `npm run test:messenger` requires an explicitly isolated `MESSENGER_TEST_HOST` and creates/removes its own temporary schema.

Live service checks and native acceptance are recorded in [release.md](release.md) and [messenger.md](messenger.md). A health response or a successful build alone does not prove authenticated messaging, Google sign-in or a two-phone conversation.
