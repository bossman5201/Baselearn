# Certificate Contract Safety Plan

Contract file:
- `contracts/LearnBaseCertificate.sol`

## Safety controls included

- Role-based access (`AccessControl`):
  - `DEFAULT_ADMIN_ROLE`
  - `ISSUER_ROLE`
  - `PAUSER_ROLE`
- Emergency stop via `Pausable`.
- Reentrancy guard on claim/withdraw flows.
- Non-transferable certificates (soulbound behavior): blocked in `_update`.
- Per learner / per certificate type duplicate protection.
- Admin can deactivate certificate types.
- Admin can set per-certificate `priceWei`.
- Admin revoke capability for abuse/fraud handling.
- Admin-only withdraw and withdraw-all for accrued certificate revenue.
- User-paid claim path via EIP-712 issuer signatures (`claimCertificate` with nonce + deadline).
  - Signed payload includes `priceWei` to prevent quote/race slippage from admin price updates.
- Empty metadata URI protections in constructor and admin updates.

## Suggested launch sequence

1. Deploy on Base Sepolia first.
2. Verify source on Basescan.
3. Test:
   - paid mint once per learner
   - duplicate mint rejection
   - wrong payment rejection
   - transfer rejection
   - pause/unpause behavior
   - withdraw behavior
4. Move to Base mainnet only after test checklist passes.

## Deploy commands

```powershell
npm install
forge --version
cast --version
npm run contract:compile
npm run contract:test
npm run contract:deploy:base-sepolia
```

Mainnet deploy:

```powershell
npm run contract:deploy:base
```

Optional verify (after deploy):

```powershell
forge verify-contract <DEPLOYED_ADDRESS> contracts/LearnBaseCertificate.sol:LearnBaseCertificate --chain base-sepolia --etherscan-api-key $env:BASESCAN_API_KEY
```

## Post-deploy hardening

- Move admin role to multisig wallet.
- Keep issuer key separate from admin key (unless intentionally operating single-wallet mode).
- Keep `CERTIFICATE_SIGNER_PRIVATE_KEY` server-only in Vercel environment variables.
- Enable monitoring alerts for mint/revoke events.
- Deploy script allows overlapping admin/issuer/pauser wallets (warns, does not block).
- Deploy script validates RPC chain ID before broadcasting.

## Important

This is a secure v1 scaffold, not a formal audit. Before high-value scale, run third-party security review.
