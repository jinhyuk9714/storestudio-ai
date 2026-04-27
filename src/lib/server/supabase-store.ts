import { createClient } from "@supabase/supabase-js";
import type {
  Asset,
  BillingEvent,
  CreditLedgerEntry,
  GenerationJob,
  Project,
  StoreData,
  UserAccount,
  WaitlistSignup
} from "@/lib/types";

type DataDriverName = "local" | "supabase";

export function selectDataDriverName(env: NodeJS.ProcessEnv = process.env): DataDriverName {
  if (env.DATA_DRIVER === "local" || env.DATA_DRIVER === "supabase") {
    return env.DATA_DRIVER;
  }
  return env.NODE_ENV === "production" ? "supabase" : "local";
}

export async function readSupabaseStore(): Promise<StoreData> {
  const client = createSupabaseAdminClient();
  const [users, projects, assets, jobs, waitlist, billingEvents, creditLedger] =
    await Promise.all([
      client.from("users").select("*"),
      client.from("projects").select("*"),
      client.from("assets").select("*"),
      client.from("generation_jobs").select("*"),
      client.from("waitlist").select("*"),
      client.from("billing_events").select("*"),
      client.from("credit_ledger").select("*")
    ]);

  assertSupabase(users.error);
  assertSupabase(projects.error);
  assertSupabase(assets.error);
  assertSupabase(jobs.error);
  assertSupabase(waitlist.error);
  assertSupabase(billingEvents.error);
  assertSupabase(creditLedger.error);

  return {
    users: (users.data ?? []).map(userFromRow),
    projects: (projects.data ?? []).map(projectFromRow),
    assets: (assets.data ?? []).map(assetFromRow),
    jobs: (jobs.data ?? []).map(jobFromRow),
    waitlist: (waitlist.data ?? []).map(waitlistFromRow),
    billingEvents: (billingEvents.data ?? []).map(billingEventFromRow),
    creditLedger: (creditLedger.data ?? []).map(creditLedgerFromRow)
  };
}

export async function writeSupabaseStore(data: StoreData): Promise<void> {
  const client = createSupabaseAdminClient();
  const writes = [
    data.users.length
      ? client.from("users").upsert(data.users.map(userToRow), { onConflict: "id" })
      : null,
    data.projects.length
      ? client.from("projects").upsert(data.projects.map(projectToRow), { onConflict: "id" })
      : null,
    data.assets.length
      ? client.from("assets").upsert(data.assets.map(assetToRow), { onConflict: "id" })
      : null,
    data.jobs.length
      ? client.from("generation_jobs").upsert(data.jobs.map(jobToRow), { onConflict: "id" })
      : null,
    data.waitlist.length
      ? client.from("waitlist").upsert(data.waitlist.map(waitlistToRow), { onConflict: "id" })
      : null,
    data.billingEvents.length
      ? client
          .from("billing_events")
          .upsert(data.billingEvents.map(billingEventToRow), { onConflict: "id" })
      : null,
    data.creditLedger.length
      ? client
          .from("credit_ledger")
          .upsert(data.creditLedger.map(creditLedgerToRow), { onConflict: "id" })
      : null
  ].filter(Boolean);

  const results = await Promise.all(writes);
  for (const result of results) {
    assertSupabase(result?.error);
  }
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_REQUIRED");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function assertSupabase(error: { message?: string } | null | undefined): void {
  if (error) {
    throw new Error(error.message ?? "SUPABASE_STORE_ERROR");
  }
}

function userFromRow(row: Record<string, unknown>): UserAccount {
  return {
    id: String(row.id),
    email: String(row.email),
    plan: row.plan as UserAccount["plan"],
    credits: Number(row.credits),
    createdAt: String(row.created_at)
  };
}

function userToRow(user: UserAccount) {
  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    credits: user.credits,
    created_at: user.createdAt
  };
}

function projectFromRow(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    productName: String(row.product_name),
    category: String(row.category),
    tone: String(row.tone),
    heroCopy: String(row.hero_copy),
    channel: row.channel as Project["channel"],
    sourceAssetIds: Array.isArray(row.source_asset_ids) ? (row.source_asset_ids as string[]) : [],
    createdAt: String(row.created_at)
  };
}

function projectToRow(project: Project) {
  return {
    id: project.id,
    user_id: project.userId,
    product_name: project.productName,
    category: project.category,
    tone: project.tone,
    hero_copy: project.heroCopy,
    channel: project.channel,
    source_asset_ids: project.sourceAssetIds,
    created_at: project.createdAt
  };
}

function assetFromRow(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: String(row.project_id),
    kind: row.kind as Asset["kind"],
    outputType: (row.output_type ?? null) as Asset["outputType"],
    url: String(row.url),
    bucketKey: (row.bucket_key as string | null) ?? null,
    publicUrl: (row.public_url as string | null) ?? null,
    signedUrl: (row.signed_url as string | null) ?? null,
    storageDriver: (row.storage_driver as Asset["storageDriver"]) ?? null,
    format: (row.format as Asset["format"]) ?? null,
    width: Number(row.width),
    height: Number(row.height),
    mimeType: String(row.mime_type),
    prompt: (row.prompt as string | null) ?? null,
    createdAt: String(row.created_at)
  };
}

function assetToRow(asset: Asset) {
  return {
    id: asset.id,
    user_id: asset.userId,
    project_id: asset.projectId,
    kind: asset.kind,
    output_type: asset.outputType,
    url: asset.url,
    bucket_key: asset.bucketKey ?? null,
    public_url: asset.publicUrl ?? null,
    signed_url: asset.signedUrl ?? null,
    storage_driver: asset.storageDriver ?? null,
    format: asset.format ?? null,
    width: asset.width,
    height: asset.height,
    mime_type: asset.mimeType,
    prompt: asset.prompt,
    created_at: asset.createdAt
  };
}

function jobFromRow(row: Record<string, unknown>): GenerationJob {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: String(row.project_id),
    status: row.status as GenerationJob["status"],
    outputTypes: Array.isArray(row.output_types)
      ? (row.output_types as GenerationJob["outputTypes"])
      : [],
    prompt: String(row.prompt ?? ""),
    cost: Number(row.cost),
    resultAssetIds: Array.isArray(row.result_asset_ids)
      ? (row.result_asset_ids as string[])
      : [],
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function jobToRow(job: GenerationJob) {
  return {
    id: job.id,
    user_id: job.userId,
    project_id: job.projectId,
    status: job.status,
    output_types: job.outputTypes,
    prompt: job.prompt,
    cost: job.cost,
    result_asset_ids: job.resultAssetIds,
    error: job.error,
    created_at: job.createdAt,
    updated_at: job.updatedAt
  };
}

function waitlistFromRow(row: Record<string, unknown>): WaitlistSignup {
  return {
    id: String(row.id),
    email: String(row.email),
    storeUrl: (row.store_url as string | null) ?? null,
    createdAt: String(row.created_at)
  };
}

function waitlistToRow(signup: WaitlistSignup) {
  return {
    id: signup.id,
    email: signup.email,
    store_url: signup.storeUrl,
    created_at: signup.createdAt
  };
}

function billingEventFromRow(row: Record<string, unknown>): BillingEvent {
  return {
    id: String(row.id),
    provider: "toss",
    userId: (row.user_id as string | null) ?? null,
    eventType: String(row.event_type),
    paymentKey: (row.payment_key as string | null) ?? null,
    orderId: (row.order_id as string | null) ?? null,
    productId: (row.product_id as string | null) ?? null,
    creditsGranted: Number(row.credits_granted),
    raw: row.raw,
    createdAt: String(row.created_at)
  };
}

function billingEventToRow(event: BillingEvent) {
  return {
    id: event.id,
    provider: event.provider,
    user_id: event.userId ?? null,
    event_type: event.eventType,
    payment_key: event.paymentKey,
    order_id: event.orderId,
    product_id: event.productId ?? null,
    credits_granted: event.creditsGranted,
    raw: event.raw,
    created_at: event.createdAt
  };
}

function creditLedgerFromRow(row: Record<string, unknown>): CreditLedgerEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    amount: Number(row.amount),
    reason: row.reason as CreditLedgerEntry["reason"],
    jobId: (row.job_id as string | null) ?? null,
    billingEventId: (row.billing_event_id as string | null) ?? null,
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at)
  };
}

function creditLedgerToRow(entry: CreditLedgerEntry) {
  return {
    id: entry.id,
    user_id: entry.userId,
    amount: entry.amount,
    reason: entry.reason,
    job_id: entry.jobId,
    billing_event_id: entry.billingEventId,
    idempotency_key: entry.idempotencyKey,
    created_at: entry.createdAt
  };
}
