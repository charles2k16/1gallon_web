# 1Gallon Web (`fuel_web`)

Customer and driver web app — interim launch while iOS is in review.

## Stack

- Nuxt 3 + Vue 3 (same family as `fuelr-admin`)
- MapLibre GL + Mapbox geocoding (OSM fallback)
- Socket.IO for live order / driver updates
- Paystack via redirect + `/payments/return`

## Setup

```bash
cd fuel_web
cp .env.example .env
# set NUXT_PUBLIC_API_BASE and NUXT_PUBLIC_MAPBOX_TOKEN
npm install
npm run dev
```

App runs at **http://localhost:3002**

Ensure backend `CLIENT_URL` includes `http://localhost:3002`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3002 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Roles

- **Customer** — map-first home, order fuel, track, pay, rate
- **Driver** — must be onboarded in admin first; jobs, earnings, status updates
