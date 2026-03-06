# Founder Hand-off Status

Latest updates received (March 6, 2026):

- Deployment is almost complete.
- Storage choice confirmed: Neon.
- `accountAssociation` payload provided for `baselearn.vercel.app`.
- Contract deployment tool confirmed: Foundry.

Remaining launch blockers are below.

## 1) GitHub

Send:

- GitHub username
- Empty repository URL for this project
- Permission for me to structure branch strategy as:
  - `main` (production)
  - `develop` (staging)

## 2) Vercel

Send:

- Vercel team/account name
- Production domain you want (example: `learnbase.app`)
- Staging domain (optional)

Then add these env vars in Vercel:

- `DATABASE_URL` (or `POSTGRES_URL`)
- `LEARN_BASE_ADMIN_TOKEN` (any strong random string)
- `LEARN_BASE_ENABLE_CLOUD_SYNC=true`

## 3) Storage choice

Confirmed:

- Neon (v1)

Current code is wired for PostgreSQL.

## 4) Branding assets

Send these files:

- `icon.png` (square app icon)
- `cover.png` (feed/discovery preview)
- `splash.png`
- `hero.png`
- `og.png`

I will place them and wire into manifest.

## 5) Legal text

Send simple first drafts for:

- Terms of Use
- Privacy Policy
- Education disclaimer text

I will add in-app pages and footer links.

## 6) Payment setup decision

Choose now:

- Keep `demo` certificate claim for launch beta
- Or wire real Base Pay before launch

I recommend: launch beta with demo claims first, then enable real payments.

## 7) Content approval

Confirm these are approved for launch:

- 20 lessons across 4 tracks
- Quiz pass score = 70%
- Certificate pricing:
  - Track cert: $0.99
  - Master cert: $2.99

If approved, I will freeze v1 content and move to deployment hardening.
