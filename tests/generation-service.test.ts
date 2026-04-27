import { describe, expect, it } from "vitest";
import { runGenerationJob } from "@/lib/generation/service";
import type { Asset, GenerationJob, Project, UserAccount } from "@/lib/types";

describe("runGenerationJob", () => {
  it("creates four generated assets and marks the job complete", async () => {
    const assets: Asset[] = [];
    const project: Project = {
      id: "project_1",
      userId: "user_1",
      productName: "아로마 캔들",
      category: "생활잡화",
      tone: "차분하고 고급스러운",
      heroCopy: "공간을 바꾸는 향",
      channel: "smartstore",
      sourceAssetIds: ["asset_source"],
      createdAt: "2026-04-27T00:00:00.000Z"
    };
    const user: UserAccount = {
      id: "user_1",
      email: "seller@example.com",
      plan: "trial",
      credits: 3,
      createdAt: "2026-04-27T00:00:00.000Z"
    };
    const job: GenerationJob = {
      id: "job_1",
      userId: user.id,
      projectId: project.id,
      status: "queued",
      outputTypes: ["white-background", "square-thumbnail", "lifestyle", "detail-hero"],
      prompt: "",
      cost: 1,
      resultAssetIds: [],
      error: null,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    };

    const result = await runGenerationJob({
      user,
      project,
      job,
      sourceAssets: [],
      createAsset: async (asset) => {
        const saved = {
          ...asset,
          id: `asset_${assets.length + 1}`,
          userId: user.id,
          projectId: project.id,
          createdAt: "2026-04-27T00:00:00.000Z"
        };
        assets.push(saved);
        return saved;
      },
      imageProvider: {
        generateProductImage: async ({ outputType }) => ({
          buffer: Buffer.from(`png-${outputType}`),
          mimeType: "image/png",
          revisedPrompt: `revised-${outputType}`
        })
      },
      saveImage: async ({ assetId }) => `/generated/${assetId}.png`
    });

    expect(result.job.status).toBe("completed");
    expect(result.job.resultAssetIds).toHaveLength(4);
    expect(result.user.credits).toBe(2);
    expect(assets.map((asset) => asset.outputType)).toEqual(job.outputTypes);
  });

  it("refunds the generation credit when the provider fails", async () => {
    const user: UserAccount = {
      id: "user_1",
      email: "seller@example.com",
      plan: "trial",
      credits: 3,
      createdAt: "2026-04-27T00:00:00.000Z"
    };
    const project: Project = {
      id: "project_1",
      userId: "user_1",
      productName: "아로마 캔들",
      category: "생활잡화",
      tone: "차분하고 고급스러운",
      heroCopy: "공간을 바꾸는 향",
      channel: "smartstore",
      sourceAssetIds: [],
      createdAt: "2026-04-27T00:00:00.000Z"
    };
    const job: GenerationJob = {
      id: "job_1",
      userId: user.id,
      projectId: project.id,
      status: "queued",
      outputTypes: ["white-background"],
      prompt: "",
      cost: 1,
      resultAssetIds: [],
      error: null,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    };

    const result = await runGenerationJob({
      user,
      project,
      job,
      sourceAssets: [],
      createAsset: async () => {
        throw new Error("should not be called after provider failure");
      },
      imageProvider: {
        generateProductImage: async () => {
          throw new Error("provider down");
        }
      },
      saveImage: async () => "/unused.png"
    });

    expect(result.job.status).toBe("failed");
    expect(result.job.error).toBe("provider down");
    expect(result.user.credits).toBe(3);
  });
});
