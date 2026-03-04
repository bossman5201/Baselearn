# Certificate Contract Safety Plan

Contract file:
- `contracts/LearnBaseCertificate.sol`

## Safety controls included

- Role-based access (`AccessControl`):
  - `DEFAULT_ADMIN_ROLE`
  - `ISSUER_ROLE`
  - `PAUSER_ROLE`
- Emergency stop via `Pausable`.
- Reentrancy guard on issuance/revoke flows.
- Non-transferable certificates (soulbound behavior): transfer functions revert.
- Per learner / per certificate type duplicate protection.
- Admin can deactivate certificate types.
- Admin revoke capability for abuse/fraud handling.

## Suggested launch sequence

1. Deploy on Base Sepolia first.
2. Verify source on Basescan.
3. Test:
   - mint once per learner
   - duplicate mint rejection
   - transfer rejection
   - pause/unpause behavior
4. Move to Base mainnet only after test checklist passes.

## Deploy commands

```powershell
npm install
npm run contract:compile
npm run contract:deploy:base-sepolia
```

Mainnet deploy:

```powershell
npm run contract:deploy:base
```

## Post-deploy hardening

- Move admin role to multisig wallet.
- Keep issuer key separate from admin key.
- Keep pauser key in separate secure wallet.
- Enable monitoring alerts for mint/revoke events.

## Important

This is a secure v1 scaffold, not a formal audit. Before high-value scale, run third-party security review.
