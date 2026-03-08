# GitHub + Vercel Setup (Your Exact Next Steps)

## A) Push current code to your repo

Repository:
- https://github.com/bossman5201/Baselearn.git

Run these commands in project root:

```powershell
git branch -M main
git push -u origin main
```

If Git asks for auth, use GitHub Desktop or GitHub PAT.

## B) Import in Vercel

1. Open Vercel dashboard.
2. Click `Add New` -> `Project`.
3. Choose `Import Git Repository`.
4. Select `bossman5201/Baselearn`.
5. Framework preset: `Other` (static + serverless).
6. Deploy.

## C) Add env vars in Vercel

Project -> Settings -> Environment Variables:

- `DATABASE_URL` (Neon connection string for production)
- `POSTGRES_URL` (optional fallback)
- `LEARN_BASE_ADMIN_TOKEN`
- `LEARN_BASE_AUTH_SECRET`
- `LEARN_BASE_ENABLE_CLOUD_SYNC=true`
- `QUIZ_RETRY_COOLDOWN_SECONDS=20`
- `BASE_CHAIN_ID=8453`
- `BASE_RPC_URL`
- `CERTIFICATE_CONTRACT_ADDRESS`
- `CERTIFICATE_SIGNER_PRIVATE_KEY`
- `CONTRACT_ADMIN_WALLET`
- `LEARN_BASE_RECONCILE_SECRET`
- `CRON_SECRET` (optional alternative; Vercel injects this into cron auth header)
- `CERTIFICATE_RECONCILE_START_BLOCK` (set deploy block)
- `CHAIN_RECONCILE_CONFIRMATIONS=2`
- `CHAIN_RECONCILE_MAX_BLOCK_RANGE=1500`
- `CHAIN_RECONCILE_LOOKBACK_BLOCKS=5000`

## D) Contract deploy env vars (local shell for Foundry)

Use these in local `.env` / shell variables when running `forge`:

- `PRIVATE_KEY`
- `FOUNDRY_ACCOUNT` (optional alternative to private key; preferred when available)
- `BASE_RPC_URL`
- `BASE_SEPOLIA_RPC_URL`
- `BASESCAN_API_KEY`
- `CONTRACT_ADMIN_WALLET`
- `CONTRACT_ISSUER_WALLET`
- `CONTRACT_PAUSER_WALLET`
- `CERT_METADATA_BASE_URI`
- `CERTIFICATE_CONTRACT_ADDRESS` (after deploy)
- `CERTIFICATE_SIGNER_PRIVATE_KEY` (backend signer key, server-side only)

Security:
- Never commit `PRIVATE_KEY` to GitHub.
- Keep `PRIVATE_KEY` only in local `.env` / shell; it is server-side only and never used in frontend code.
- Script allows shared admin/issuer/pauser wallets, but separate wallets are safer for production.

## E) Domain

After first deploy:
1. Add your custom domain.
2. Update `.well-known/farcaster.json` URLs to your real domain.
3. Redeploy.

## F) Verify backend

Check these URLs after deploy:

- `/api/health`
- `/api/profile?learnerId=<id>&learnerSecret=<secret>`
- `/api/contract-status`
- `/api/reconcile-chain` (use auth header)

Expected:
- health returns `{ ok: true, storageReady: true/false }`
- profile returns a profile object when storage is ready and learner secret is valid.
- contract-status returns contract config + certificate pricing.
- reconcile-chain returns `{ ok: true, stats: ... }` when called with `Authorization: Bearer <LEARN_BASE_RECONCILE_SECRET>`.

## G) Deploy certificate contract (Foundry)

Run from project root:

```powershell
npm run contract:compile
npm run contract:deploy:base-sepolia
npm run miniapp:check
```

Then mainnet:

```powershell
npm run contract:deploy:base
```
