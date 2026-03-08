# Learn Base Mini App

Content-first Base mini app with safe lessons, quizzes, optional certificates, and cloud sync support.

## Current build status

- Frontend MVP complete:
  - 4 tracks, 20 lessons
  - quizzes and explanations
  - progress dashboard
  - optional certificate claims
- Backend endpoints added for Vercel:
  - `GET /api/health`
  - `GET /api/profile?learnerId=...&learnerSecret=...`
  - `POST /api/progress`
  - `POST /api/auth-wallet`
  - `POST /api/certificate-quote`
  - `POST /api/certificate-claim`
  - `GET /api/contract-status`
  - `POST /api/admin-withdraw-intent`
  - `POST /api/admin-withdraw-log`
  - `GET|POST /api/reconcile-chain`
- Storage adapter:
  - Uses PostgreSQL (`DATABASE_URL` or `POSTGRES_URL`) for profile persistence.
  - Neon selected for v1 deployment.

## Project structure

- `index.html`: app shell
- `styles.css`: responsive UI
- `app.js`: routing, quiz engine, progress, cloud sync client
- `data/lessons.js`: tracks + lessons + quiz content
- `api/`: Vercel serverless functions
- `.well-known/farcaster.json`: mini app manifest scaffold
- `.env.example`: required environment variables
- `contracts/`: certificate smart contract (Base-ready)
- `scripts/`: Foundry deployment helper + asset generation
- `foundry.toml`: Foundry project config for contract compile/deploy
- `certificates/`: token metadata JSON and canonical `certificate-types.json` mapping
- `GITHUB_VERCEL_SETUP.md`: exact setup checklist
- `BRANDING_PROMPTS.md`: image generation prompts
- `CONTRACT_SAFETY.md`: security and deployment notes

## Environment variables

Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` (or `POSTGRES_URL`)
- `LEARN_BASE_ADMIN_TOKEN` (reserved for future admin routes)
- `LEARN_BASE_AUTH_SECRET` (required for wallet-auth token signing)
- `LEARN_BASE_AUTH_MAX_WINDOW_SECONDS` (default `600`)
- `QUIZ_RETRY_COOLDOWN_SECONDS` (default `20`)
- `LEARN_BASE_ENABLE_CLOUD_SYNC=true`
- `BASE_CHAIN_ID=8453`
- `BASE_RPC_URL`
- `CERTIFICATE_CONTRACT_ADDRESS`
- `CERTIFICATE_SIGNER_PRIVATE_KEY` (server only; never expose to client)
- `CONTRACT_ADMIN_WALLET`
- `LEARN_BASE_RECONCILE_SECRET` (required to secure `/api/reconcile-chain`)
- `CERTIFICATE_RECONCILE_START_BLOCK` (set to contract deploy block for first sync)
- `CHAIN_RECONCILE_CONFIRMATIONS` (default `2`)
- `CHAIN_RECONCILE_MAX_BLOCK_RANGE` (default `1500`)
- `CHAIN_RECONCILE_LOOKBACK_BLOCKS` (default `5000`)

## Deployment (Vercel)

1. Push this folder to a GitHub repo.
2. Import repo into Vercel.
3. Add environment variables above.
4. Deploy.
5. Update `.well-known/farcaster.json` URLs to your real domain.
6. Confirm `accountAssociation` values match the active production domain.
7. Re-share mini app URL after manifest updates so indexing refreshes.

## Learner identity and sync

- User sets a `learnerId` in the app (3 to 40 chars, `a-z`, `0-9`, `_`, `-`).
- App also generates a local `learnerSecret` (stored only on device). Backend stores only its hash.
- Progress and certificates are saved locally and synced to cloud when backend is ready.
- If cloud is unavailable, app stays fully functional in local mode.

## Payment status

- Users mint certificates directly from their own wallet on Base mainnet.
- Backend signs short-lived EIP-712 mint quotes after verifying lesson eligibility from Neon profile data.
- Claim submission is only persisted after onchain receipt validation.
- Onchain reconciliation endpoint (`/api/reconcile-chain`) backfills claim/withdraw state from events if user closes app before sync.
- Revenue remains in contract until admin wallet calls withdraw.

## Reconciliation cron

- `vercel.json` schedules `/api/reconcile-chain` every 5 minutes.
- Set either `LEARN_BASE_RECONCILE_SECRET` or `CRON_SECRET` in Vercel.
- If you use Vercel `CRON_SECRET`, Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

## Smart contract status

- `LearnBaseCertificate` contract scaffold added with:
  - role-based access control
  - pause/unpause emergency controls
  - non-transferable certificates
  - duplicate-claim prevention
  - re-issuable certificates after admin revoke
  - empty-URI and signature replay/expiry protections
- Deploy flow is prepared for Base Sepolia and Base mainnet via Foundry (`forge` + `cast`).

## Mini app checks

- Run `npm run miniapp:check` to validate `.well-known/farcaster.json` against OnchainKit MiniKit manifest rules.

## Accuracy baseline

Research baseline date: March 4, 2026.

Sources used are listed in `research/base-doc-notes.md`.
