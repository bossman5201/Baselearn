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

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `LEARN_BASE_ADMIN_TOKEN`
- `LEARN_BASE_ENABLE_CLOUD_SYNC=true`
- `PRIVATE_KEY` (for contract deploy jobs only if you use Vercel CI for this)
- `BASE_RPC_URL`
- `BASE_SEPOLIA_RPC_URL`
- `BASESCAN_API_KEY`
- `CONTRACT_ADMIN_WALLET`
- `CONTRACT_ISSUER_WALLET`
- `CONTRACT_PAUSER_WALLET`
- `CERT_METADATA_BASE_URI`

## D) Domain

After first deploy:
1. Add your custom domain.
2. Update `.well-known/farcaster.json` URLs to your real domain.
3. Redeploy.

## E) Verify backend

Check these URLs after deploy:

- `/api/health`
- `/api/profile?learnerId=test_founder`

Expected:
- health returns `{ ok: true, storageReady: true/false }`
- profile returns a profile object when storage is ready.
