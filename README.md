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
  - `GET /api/profile?learnerId=...`
  - `POST /api/progress`
  - `POST /api/certificate-claim`
- Storage adapter:
  - Uses PostgreSQL (`DATABASE_URL` or `POSTGRES_URL`) for profile persistence.

## Project structure

- `index.html`: app shell
- `styles.css`: responsive UI
- `app.js`: routing, quiz engine, progress, cloud sync client
- `data/lessons.js`: tracks + lessons + quiz content
- `api/`: Vercel serverless functions
- `.well-known/farcaster.json`: mini app manifest scaffold
- `.env.example`: required environment variables
- `contracts/`: certificate smart contract (Base-ready)
- `scripts/`: Hardhat deployment scripts
- `certificates/`: token metadata JSON used by certificate contract URIs
- `GITHUB_VERCEL_SETUP.md`: exact setup checklist
- `BRANDING_PROMPTS.md`: image generation prompts
- `CONTRACT_SAFETY.md`: security and deployment notes

## Environment variables

Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` (or `POSTGRES_URL`)
- `LEARN_BASE_ADMIN_TOKEN` (reserved for future admin routes)
- `LEARN_BASE_ENABLE_CLOUD_SYNC=true`

## Deployment (Vercel)

1. Push this folder to a GitHub repo.
2. Import repo into Vercel.
3. Add environment variables above.
4. Deploy.
5. Update `.well-known/farcaster.json` URLs to your real domain.
6. Replace `accountAssociation` placeholders with real signed values.
7. Re-share mini app URL after manifest updates so indexing refreshes.

## Learner identity and sync

- User sets a `learnerId` in the app (3 to 40 chars, `a-z`, `0-9`, `_`, `-`).
- Progress and certificates are saved locally and synced to cloud when backend is ready.
- If cloud is unavailable, app stays fully functional in local mode.

## Payment status

- Certificate payment mode is currently `demo` in frontend.
- Real Base Pay checkout is the next integration step.

## Smart contract status

- `LearnBaseCertificate` contract scaffold added with:
  - role-based access control
  - pause/unpause emergency controls
  - non-transferable certificates
  - duplicate-claim prevention
- Deploy flow is prepared for Base Sepolia and Base mainnet via Hardhat scripts.

## Accuracy baseline

Research baseline date: March 4, 2026.

Sources used are listed in `research/base-doc-notes.md`.
