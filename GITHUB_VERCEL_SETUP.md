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
- `LEARN_BASE_ENABLE_CLOUD_SYNC=true`

## D) Contract deploy env vars (local shell for Foundry)

Use these in local `.env` / shell variables when running `forge`:

- `PRIVATE_KEY`
- `BASE_RPC_URL`
- `BASE_SEPOLIA_RPC_URL`
- `BASESCAN_API_KEY`
- `CONTRACT_ADMIN_WALLET`
- `CONTRACT_ISSUER_WALLET`
- `CONTRACT_PAUSER_WALLET`
- `CERT_METADATA_BASE_URI`

## E) Domain

After first deploy:
1. Add your custom domain.
2. Update `.well-known/farcaster.json` URLs to your real domain.
3. Redeploy.

## F) Verify backend

Check these URLs after deploy:

- `/api/health`
- `/api/profile?learnerId=test_founder`

Expected:
- health returns `{ ok: true, storageReady: true/false }`
- profile returns a profile object when storage is ready.

## G) Deploy certificate contract (Foundry)

Run from project root:

```powershell
npm run contract:compile
npm run contract:deploy:base-sepolia
```

Then mainnet:

```powershell
npm run contract:deploy:base
```
