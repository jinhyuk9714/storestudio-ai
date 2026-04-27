# Vercel Deployment

## Current Project

- Vercel project: `beta-deploy-readiness`
- Team/scope: `jinhyuks-projects-6780eaad`
- Git repository: `https://github.com/jinhyuk9714/storestudio-ai`
- Latest deployment URL: `https://beta-deploy-readiness.vercel.app`

The project is connected to the GitHub repository with `vercel git connect`, so pushes to the production branch can trigger Vercel deployments after the Vercel GitHub integration is authorized for the account.

## Environment Status

The following non-secret values have been added to Vercel production and preview environments:

- `DATA_DRIVER=supabase`
- `STORAGE_DRIVER=r2`
- `JOB_DRIVER=trigger`
- `AUTH_REQUIRED=true`
- `DAILY_OPENAI_BUDGET_KRW=100000`
- `MAX_JOBS_PER_USER_PER_DAY=30`
- `MAX_CONCURRENT_JOBS_PER_USER=2`
- `ADMIN_UI_ENABLED=false`

The following secret or account-specific values have been added to Vercel production and preview environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `TRIGGER_SECRET_KEY`
- `TRIGGER_GENERATION_TASK_URL`
- `TOSS_SECRET_KEY`
- `OPENAI_API_KEY`
- `ADMIN_TOKEN`

The current `TRIGGER_GENERATION_TASK_URL` points to the app-hosted production runner:

```text
https://beta-deploy-readiness.vercel.app/api/jobs/generations/run
```

That keeps beta job execution asynchronous without requiring a separate Trigger.dev project yet. If Trigger.dev is added later, replace this URL with the Trigger task endpoint and keep the same bearer-secret contract.

The admin-only readiness endpoint should report `productionReady: true`:

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://beta-deploy-readiness.vercel.app/api/ops/health
```

The endpoint reports configured and missing variable names only. It never returns secret values.
