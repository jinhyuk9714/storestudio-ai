const REQUIRED_SECRET_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_GENERATION_TASK_URL",
  "TOSS_SECRET_KEY",
  "OPENAI_API_KEY",
  "ADMIN_TOKEN"
] as const;

const NON_SECRET_CONFIG_NAMES = [
  "DATA_DRIVER",
  "STORAGE_DRIVER",
  "JOB_DRIVER",
  "AUTH_REQUIRED",
  "DAILY_OPENAI_BUDGET_KRW",
  "MAX_JOBS_PER_USER_PER_DAY",
  "MAX_CONCURRENT_JOBS_PER_USER",
  "ADMIN_UI_ENABLED"
] as const;

export type OpsHealthReport = {
  checkedAt: string;
  environment: string;
  productionReady: boolean;
  configuredSecrets: string[];
  missingSecrets: string[];
  config: Record<string, string | null>;
  blockers: string[];
};

export function buildOpsHealthReport(
  env: Partial<NodeJS.ProcessEnv> = process.env
): OpsHealthReport {
  const configuredSecrets = REQUIRED_SECRET_NAMES.filter((name) => hasValue(env[name]));
  const missingSecrets = REQUIRED_SECRET_NAMES.filter((name) => !hasValue(env[name]));
  const config = Object.fromEntries(
    NON_SECRET_CONFIG_NAMES.map((name) => [name, hasValue(env[name]) ? String(env[name]) : null])
  );
  const blockers = buildBlockers(env, missingSecrets);

  return {
    checkedAt: new Date().toISOString(),
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? "unknown",
    productionReady: missingSecrets.length === 0 && blockers.length === 0,
    configuredSecrets,
    missingSecrets,
    config,
    blockers
  };
}

function buildBlockers(
  env: Partial<NodeJS.ProcessEnv>,
  missingSecrets: readonly string[]
): string[] {
  const missing = new Set(missingSecrets);
  const blockers: string[] = [];

  if (env.AUTH_REQUIRED === "true" && missing.has("NEXT_PUBLIC_SUPABASE_URL")) {
    blockers.push("Supabase auth cannot send magic links until Supabase URL and keys are configured.");
  }

  if ((env.DATA_DRIVER ?? "local") === "supabase" && missing.has("SUPABASE_SERVICE_ROLE_KEY")) {
    blockers.push("Supabase Postgres driver cannot read or write data until service role credentials are configured.");
  }

  if ((env.STORAGE_DRIVER ?? "local") === "r2" && missing.has("R2_SECRET_ACCESS_KEY")) {
    blockers.push("Cloudflare R2 storage cannot save uploaded or generated assets until R2 credentials are configured.");
  }

  if ((env.JOB_DRIVER ?? "local") === "trigger" && missing.has("TRIGGER_GENERATION_TASK_URL")) {
    blockers.push("Trigger.dev queueing cannot dispatch generation jobs until the task URL and secret are configured.");
  }

  if (missing.has("TOSS_SECRET_KEY")) {
    blockers.push("Toss Payments confirm flow cannot grant paid credits until a Toss secret key is configured.");
  }

  if (missing.has("OPENAI_API_KEY")) {
    blockers.push("OpenAI image generation will not run in production until an OpenAI API key is configured.");
  }

  return blockers;
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
