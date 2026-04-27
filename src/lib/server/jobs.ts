import { createImageProvider } from "@/lib/generation/providers";
import { runGenerationJob } from "@/lib/generation/service";
import { saveGeneratedImage } from "@/lib/server/assets";
import { recordCreditLedgerMemo } from "@/lib/server/credit-ledger";
import {
  createGeneratedAsset,
  mutateStore,
  readStore
} from "@/lib/server/store";
import type { Asset, GenerationJob, Project, UserAccount } from "@/lib/types";

type EnvShape = Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "JOB_DRIVER">>;

export type JobDriverName = "local" | "trigger";

export type EnqueueGenerationJobResult = {
  mode: JobDriverName;
  processed: boolean;
  result?: {
    user: UserAccount;
    job: GenerationJob;
    assets: Asset[];
  };
};

export function selectJobDriverName(env: EnvShape = process.env): JobDriverName {
  if (env.JOB_DRIVER === "local" || env.JOB_DRIVER === "trigger") {
    return env.JOB_DRIVER;
  }
  return env.NODE_ENV === "production" ? "trigger" : "local";
}

export async function enqueueGenerationJob(jobId: string): Promise<EnqueueGenerationJobResult> {
  const mode = selectJobDriverName();

  if (mode === "local") {
    return {
      mode,
      processed: true,
      result: await processGenerationJob(jobId)
    };
  }

  await triggerGenerationJob(jobId);
  return { mode, processed: false };
}

export async function processGenerationJob(jobId: string): Promise<{
  user: UserAccount;
  job: GenerationJob;
  assets: Asset[];
}> {
  const data = await readStore();
  const job = data.jobs.find((candidate) => candidate.id === jobId);

  if (!job) {
    throw new Error("JOB_NOT_FOUND");
  }

  const user = data.users.find((candidate) => candidate.id === job.userId);
  const project = data.projects.find((candidate) => candidate.id === job.projectId);

  if (!user || !project) {
    throw new Error("GENERATION_CONTEXT_NOT_FOUND");
  }

  if (job.status === "completed") {
    return {
      user,
      job,
      assets: data.assets.filter((asset) => job.resultAssetIds.includes(asset.id))
    };
  }

  const sourceAssets = data.assets.filter((asset) => project.sourceAssetIds.includes(asset.id));
  return runAndPersistGeneration({
    user,
    project,
    job,
    sourceAssets
  });
}

async function runAndPersistGeneration(input: {
  user: UserAccount;
  project: Project;
  job: GenerationJob;
  sourceAssets: Asset[];
}) {
  const imageProvider = createImageProvider();
  const createdAssets: Asset[] = [];
  const result = await runGenerationJob({
    ...input,
    imageProvider,
    createAsset: async (assetInput) => {
      const asset = createGeneratedAsset(input.user.id, input.project.id, assetInput);
      createdAssets.push(asset);
      return asset;
    },
    saveImage: async ({ assetId, buffer, mimeType, outputType }) =>
      saveGeneratedImage({
        assetId,
        buffer,
        mimeType,
        outputType,
        project: input.project,
        watermark: input.user.plan === "trial"
      })
  });

  await mutateStore((store) => {
    const userIndex = store.users.findIndex((candidate) => candidate.id === input.user.id);
    if (userIndex >= 0) {
      store.users[userIndex] = result.user;
    }

    const jobIndex = store.jobs.findIndex((candidate) => candidate.id === input.job.id);
    if (jobIndex >= 0) {
      store.jobs[jobIndex] = result.job;
    }

    const alreadyPersisted = new Set(store.assets.map((asset) => asset.id));
    store.assets.push(...createdAssets.filter((asset) => !alreadyPersisted.has(asset.id)));

    if (result.job.error !== "INSUFFICIENT_CREDITS") {
      recordCreditLedgerMemo(store, {
        userId: input.user.id,
        amount: -input.job.cost,
        reason: "generation_debit",
        jobId: input.job.id,
        idempotencyKey: `${input.job.id}:generation_debit`
      });
    }

    if (result.job.status === "failed" && result.job.error !== "INSUFFICIENT_CREDITS") {
      recordCreditLedgerMemo(store, {
        userId: input.user.id,
        amount: input.job.cost,
        reason: "generation_refund",
        jobId: input.job.id,
        idempotencyKey: `${input.job.id}:generation_refund`
      });
    }
  });

  return {
    user: result.user,
    job: result.job,
    assets: result.assets
  };
}

async function triggerGenerationJob(jobId: string): Promise<void> {
  if (!process.env.TRIGGER_GENERATION_TASK_URL) {
    return;
  }

  const response = await fetch(process.env.TRIGGER_GENERATION_TASK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY ?? ""}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ jobId })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "TRIGGER_ENQUEUE_FAILED");
  }
}
