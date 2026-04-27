# Production Smoke Test

Run this checklist after every production deploy and before inviting a new beta batch.

## Setup

- Confirm Vercel deployment is on the expected `main` commit.
- Confirm production env vars are set for Supabase, Cloudflare R2, Trigger.dev, Toss Payments, OpenAI, and admin access.
- Call `GET /api/ops/health` with `Authorization: Bearer <ADMIN_TOKEN>` and confirm `productionReady` is `true`.
- Keep Toss Payments in test mode until the live merchant review is complete.

## Core Flow

- Complete magic-link login with a beta email address.
- Create one product project.
- Upload one JPG or PNG product image.
- Start a 4-output generation job.
- Confirm job completion polling reaches `completed`.
- Confirm generated assets render in the gallery.
- Download a ZIP export and inspect the filenames.

## Failure And Billing Flow

- Temporarily force a generation failure in a preview deployment and confirm the job becomes `failed`.
- Confirm the failed job refunds one credit.
- Confirm `GET /api/admin/jobs` shows the failed job when called with `ADMIN_TOKEN`.
- Create a Toss test checkout for `starter_30`.
- Confirm Toss payment and verify credits increase by 30.
- Send a duplicate webhook with the same `paymentKey` or `orderId`.
- Confirm the duplicate webhook does not grant credits twice.

## Quality Gate

- Generate five real sample products with OpenAI enabled.
- Record every result in `docs/beta-qa-template.csv`.
- Do not invite the next beta batch unless download rate is at least 40% and "그대로 업로드 가능" reaches at least 50%.
