import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { ensureRuntimeDirs, STORE_PATH } from "@/lib/server/paths";
import {
  readSupabaseStore,
  selectDataDriverName,
  writeSupabaseStore
} from "@/lib/server/supabase-store";
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

const DEMO_EMAIL = "demo@storestudio.ai";

export async function readStore(): Promise<StoreData> {
  if (selectDataDriverName() === "supabase") {
    return readSupabaseStore();
  }

  await ensureRuntimeDirs();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<StoreData>);
  } catch (error) {
    const initial = createInitialStore();
    await writeStore(initial);
    return initial;
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  if (selectDataDriverName() === "supabase") {
    await writeSupabaseStore(data);
    return;
  }

  await ensureRuntimeDirs();
  await writeFile(STORE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function mutateStore<T>(mutator: (data: StoreData) => T | Promise<T>): Promise<T> {
  const data = await readStore();
  const result = await mutator(data);
  await writeStore(data);
  return result;
}

export async function getDemoUser(): Promise<UserAccount> {
  return ensureUser(DEMO_EMAIL);
}

export async function ensureUser(email: string, preferredId?: string): Promise<UserAccount> {
  const data = await readStore();
  let user = data.users.find(
    (candidate) => candidate.email === email || Boolean(preferredId && candidate.id === preferredId)
  );

  if (!user) {
    user = createUser(email, preferredId);
    data.users.push(user);
    await writeStore(data);
  }

  return user;
}

export function createUser(email: string, preferredId?: string): UserAccount {
  return {
    id: preferredId ?? `user_${randomUUID()}`,
    email,
    plan: "trial",
    credits: 3,
    createdAt: new Date().toISOString()
  };
}

export function createProject(
  input: Omit<Project, "id" | "createdAt" | "sourceAssetIds">
): Project {
  return {
    ...input,
    id: `project_${randomUUID()}`,
    sourceAssetIds: [],
    createdAt: new Date().toISOString()
  };
}

export function createSourceAsset(
  input: Omit<Asset, "kind" | "outputType" | "prompt" | "createdAt">
): Asset {
  return {
    ...input,
    kind: "source",
    outputType: null,
    prompt: null,
    createdAt: new Date().toISOString()
  };
}

export function createJob(input: Omit<GenerationJob, "id" | "status" | "resultAssetIds" | "error" | "createdAt" | "updatedAt">): GenerationJob {
  const now = new Date().toISOString();

  return {
    ...input,
    id: `job_${randomUUID()}`,
    status: "queued",
    resultAssetIds: [],
    error: null,
    createdAt: now,
    updatedAt: now
  };
}

export function createGeneratedAsset(
  userId: string,
  projectId: string,
  input: Omit<Asset, "id" | "userId" | "projectId" | "createdAt">
): Asset {
  return {
    ...input,
    id: `asset_${randomUUID()}`,
    userId,
    projectId,
    createdAt: new Date().toISOString()
  };
}

export function createWaitlistSignup(input: {
  email: string;
  storeUrl: string | null;
}): WaitlistSignup {
  return {
    id: `wait_${randomUUID()}`,
    email: input.email,
    storeUrl: input.storeUrl,
    createdAt: new Date().toISOString()
  };
}

export function createBillingEvent(input: Omit<BillingEvent, "id" | "createdAt">): BillingEvent {
  return {
    ...input,
    id: `bill_${randomUUID()}`,
    createdAt: new Date().toISOString()
  };
}

export function createCreditLedgerEntry(
  input: Omit<CreditLedgerEntry, "id" | "createdAt">
): CreditLedgerEntry {
  return {
    ...input,
    id: `ledger_${randomUUID()}`,
    createdAt: new Date().toISOString()
  };
}

function createInitialStore(): StoreData {
  const user = createUser(DEMO_EMAIL);

  return {
    users: [user],
    projects: [],
    assets: [],
    jobs: [],
    waitlist: [],
    billingEvents: [],
    creditLedger: [
      createCreditLedgerEntry({
        userId: user.id,
        amount: user.credits,
        reason: "trial_grant",
        jobId: null,
        billingEventId: null,
        idempotencyKey: `trial:${user.id}`
      })
    ]
  };
}

function normalizeStore(data: Partial<StoreData>): StoreData {
  return {
    users: data.users ?? [],
    projects: data.projects ?? [],
    assets: data.assets ?? [],
    jobs: data.jobs ?? [],
    waitlist: data.waitlist ?? [],
    billingEvents: data.billingEvents ?? [],
    creditLedger: data.creditLedger ?? []
  };
}
