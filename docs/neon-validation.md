# Neon setup validation

Recorded from the completed setup run. Credentials and user/session identifiers are omitted.

```text
neon deploy --env .env
Applied changes
  + bucket assets
  + function api
Utilized services: Postgres, Object Storage, Functions
Pulled 8 Neon variables into .env

npm run db:migrate
Applied 001_neon_services.sql
Database migrations passed

npm run build
Web Bundled 4221ms node_modules\expo-router\entry.js (1111 modules)
Exported: dist
Backend build passed (Node.js 24)

npm test
tests 15
pass 15
fail 0

npm run backend:smoke
PASS: deployed function health and unauthenticated rejection
PASS: app client -> Neon Function -> Postgres preferences write/read
PASS: app client -> Function -> private object storage; downloaded bytes match; Postgres metadata verified
NOT TESTED: live cross-user check (BACKEND_OTHER_TOKEN not supplied)
PASS: test preferences restored and test upload removed
```

Migration 001 passed first on an isolated, expiring branch. Lint and typecheck passed. Browser checks passed signed-out route guards, Google handoff, cancellation, and reload. The development app was restarted at `http://localhost:8081` and opened on Pixel 8.

Android checks passed saving preferences, reading the saved value after reload, selecting/cropping a photo in the system picker, uploading that image through the deployed API, verifying private storage download and database metadata, and removing the test object/metadata. The original System appearance was restored. Home still showed the placeholder chats and plus button.

Private database, S3, and Clerk secret values were absent from the release browser bundle. `.env` and `.neon` are gitignored.

The initial login timeout and config/build setup errors were resolved. `npm audit` still reports 28 dependency findings: 8 moderate and 20 high, with no critical findings. No broad breaking upgrades were applied. Live second-account isolation was not exercised; automated tests cover two-user resource isolation and Clerk verification.
