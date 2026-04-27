import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { DEFAULT_OUTPUT_TYPES } from "@/lib/presets";
import { resolveRequestUser } from "@/lib/server/auth";
import { enqueueGenerationJob } from "@/lib/server/jobs";
import {
  createJob,
  mutateStore,
  readStore
} from "@/lib/server/store";

const generationSchema = z.object({
  projectId: z.string().min(1),
  outputTypes: z
    .array(z.enum(["white-background", "square-thumbnail", "lifestyle", "detail-hero"]))
    .min(1)
    .max(4)
    .optional()
});

export async function POST(request: Request) {
  try {
    const body = generationSchema.parse(await request.json());
    const user = await resolveRequestUser(request);
    const data = await readStore();
    const project = data.projects.find(
      (candidate) => candidate.id === body.projectId && candidate.userId === user.id
    );

    if (!project) {
      return jsonError("PROJECT_NOT_FOUND", 404);
    }

    const sourceAssets = data.assets.filter((asset) => project.sourceAssetIds.includes(asset.id));
    assertGenerationLimits(data, user.id, sourceAssets.length);

    const job = createJob({
      userId: user.id,
      projectId: project.id,
      outputTypes: body.outputTypes ?? DEFAULT_OUTPUT_TYPES,
      prompt: "",
      cost: 1
    });
    await mutateStore((store) => {
      store.jobs.push(job);
    });

    const enqueue = await enqueueGenerationJob(job.id);
    const result = enqueue.result ?? {
      user,
      job,
      assets: []
    };

    return NextResponse.json(
      {
        ...result,
        queued: !enqueue.processed,
        jobDriver: enqueue.mode
      },
      { status: 201 }
    );
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}

function assertGenerationLimits(data: Awaited<ReturnType<typeof readStore>>, userId: string, sourceCount: number) {
  if (sourceCount < 1) {
    throw new Error("SOURCE_IMAGE_REQUIRED");
  }
  if (sourceCount > 5) {
    throw new Error("SOURCE_IMAGE_LIMIT_EXCEEDED");
  }

  const concurrentLimit = Number(process.env.MAX_CONCURRENT_JOBS_PER_USER ?? 2);
  const activeJobs = data.jobs.filter(
    (job) => job.userId === userId && (job.status === "queued" || job.status === "processing")
  );
  if (activeJobs.length >= concurrentLimit) {
    throw new Error("TOO_MANY_ACTIVE_JOBS");
  }

  const today = new Date().toISOString().slice(0, 10);
  const maxJobsPerDay = Number(process.env.MAX_JOBS_PER_USER_PER_DAY ?? 30);
  const todaysJobs = data.jobs.filter(
    (job) => job.userId === userId && job.createdAt.startsWith(today)
  );
  if (todaysJobs.length >= maxJobsPerDay) {
    throw new Error("DAILY_JOB_LIMIT_EXCEEDED");
  }

  const budgetKrw = Number(process.env.DAILY_OPENAI_BUDGET_KRW ?? 0);
  if (budgetKrw > 0) {
    const estimatedSpendKrw = todaysJobs.reduce((total, job) => total + job.cost * 1000, 0);
    if (estimatedSpendKrw >= budgetKrw) {
      throw new Error("DAILY_OPENAI_BUDGET_EXCEEDED");
    }
  }
}
