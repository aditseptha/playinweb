# playinweb

YouTube-style catalogue of indie web games. Browse by plays, check popularity, play in-page when a game allows it, and register your own listing.

```bash
npm install
npm run dev
```

Listings and play counts persist in this browser (`localStorage`). Ranking is `plays + promotionBoost`; boost stays at 0 until bidding ships.

## Polar sandbox (donations and tips)

Use Polar sandbox so test checkouts do not charge a real card. Sandbox is a separate org from polar.sh: different dashboard, token, and product IDs.

1. Open [sandbox.polar.sh](https://sandbox.polar.sh) and pick a sandbox organization.
2. Create two products (donation and tip). Allow custom / pay-what-you-want amounts if Polar offers it.
3. Create an organization access token with `checkouts:write` and `checkouts:read`.
4. Copy into `.env.local` and restart the dev server:

```
POLAR_SERVER=sandbox
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_PRODUCT_ID=<sandbox donation product uuid>
POLAR_TIP_PRODUCT_ID=<sandbox tip product uuid>
```

Do not put the live polar.sh product ID in `POLAR_PRODUCT_ID` while `POLAR_SERVER=sandbox`.
