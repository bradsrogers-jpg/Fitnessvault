# FitVault fixed full app

This version is cleaned up so the current UI works end-to-end, and AI image parsing is enabled when your OpenAI key is configured.

## Included and working
- refreshed glassmorphism-style mobile UI with AI lab controls
- check-ins
- dashboard totals (calories + protein placeholder)
- workouts endpoint
- nutrition logs
- media uploads to R2 (when `MEDIA` binding is configured)
- AI image analysis endpoints:
  - `/api/ai/meal`
  - `/api/ai/label`
  - `/api/ai/workout`

## Deploy
Use Cloudflare Workers (not Pages).

## Required bindings
- `DB` (D1)
- `ASSETS` (static assets)
- `MEDIA` (R2 bucket, optional but required for uploads)
- `OPENAI_API_KEY` (required for AI endpoints)

## Optional variables
- `MEDIA_PUBLIC_URL` (returns direct image URL after upload)

## Setup
1. Deploy worker/static assets.
2. Run `schema.sql` against your D1 database.
3. Set your real `OPENAI_API_KEY` in Worker secrets/vars.


## Validation
- Run `npm run check` for a quick syntax smoke test of frontend and worker code.
## Troubleshooting
- If commits are not visible in a hosted UI, verify a git remote is configured and pushed.


## CI / Cloudflare dashboard deploy fix
If your deploy log shows `/bin/sh: 1: wrangler: not found`, your build environment does not have global Wrangler installed.

Use one of these deploy commands instead:
- `npm install && npm run deploy:ci`
- `npx wrangler versions upload`

For local/manual deploy:
- `npm install`
- `npm run deploy`

