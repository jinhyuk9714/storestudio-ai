# StoreStudio AI

AI product-photo SaaS MVP for Korean SmartStore, Coupang, and Instagram sellers.

StoreStudio AI turns 1-5 source product images into a fixed commerce image set:

- White-background product cut
- 1:1 thumbnail
- Lifestyle cut
- Detail-page hero image

The app is built as a web SaaS first. It keeps local mock drivers for development, while production can use Supabase, Cloudflare R2, Trigger.dev, Toss Payments, and OpenAI image generation.

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth/Postgres driver
- Cloudflare R2-compatible storage driver
- OpenAI Image API provider with local mock fallback
- Toss Payments credit flow
- Vitest

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

By default, development uses local storage, a JSON-backed store, local job execution, and mock image generation when `OPENAI_API_KEY` is not set.

## Environment

Copy `.env.example` to `.env.local` and fill production credentials when moving beyond local development.

Important production drivers:

- `DATA_DRIVER=supabase`
- `STORAGE_DRIVER=r2`
- `JOB_DRIVER=trigger`
- `AUTH_REQUIRED=true`

## Verification

```bash
npm test
npx tsc --noEmit
npm run build
```
