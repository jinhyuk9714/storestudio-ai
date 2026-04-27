import { debitCredits, refundCredits } from "@/lib/credits";
import { OUTPUT_PRESET_BY_ID } from "@/lib/presets";
import { buildImagePrompt } from "@/lib/prompts";
import type { Asset, GenerationJob, OutputType, Project, UserAccount } from "@/lib/types";

export type ProductImageRequest = {
  project: Project;
  sourceAssets: Asset[];
  outputType: OutputType;
  prompt: string;
};

export type ProductImageResult = {
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  revisedPrompt?: string;
};

export type ProductImageProvider = {
  generateProductImage(request: ProductImageRequest): Promise<ProductImageResult>;
};

export type SavedImageReference =
  | string
  | {
      url: string;
      bucketKey?: string | null;
      publicUrl?: string | null;
      signedUrl?: string | null;
      storageDriver?: "local" | "r2" | null;
      format?: "jpg" | "png" | "webp" | null;
    };

export type RunGenerationJobInput = {
  user: UserAccount;
  project: Project;
  job: GenerationJob;
  sourceAssets: Asset[];
  imageProvider: ProductImageProvider;
  saveImage(input: {
    assetId: string;
    buffer: Buffer;
    mimeType: string;
    outputType: OutputType;
  }): Promise<SavedImageReference>;
  createAsset(asset: Omit<Asset, "id" | "userId" | "projectId" | "createdAt">): Promise<Asset>;
};

export type RunGenerationJobResult = {
  user: UserAccount;
  job: GenerationJob;
  assets: Asset[];
};

export async function runGenerationJob(
  input: RunGenerationJobInput
): Promise<RunGenerationJobResult> {
  let chargedUser: UserAccount;

  try {
    chargedUser = debitCredits(input.user, input.job.cost);
  } catch (error) {
    return {
      user: input.user,
      job: failJob(input.job, error),
      assets: []
    };
  }

  const now = new Date().toISOString();
  const processingJob: GenerationJob = {
    ...input.job,
    status: "processing",
    updatedAt: now
  };
  const assets: Asset[] = [];
  const prompts: string[] = [];

  try {
    for (const outputType of processingJob.outputTypes) {
      const prompt = buildImagePrompt({
        productName: input.project.productName,
        category: input.project.category,
        tone: input.project.tone,
        channel: input.project.channel,
        heroCopy: input.project.heroCopy,
        outputType
      });
      prompts.push(prompt);

      const generated = await input.imageProvider.generateProductImage({
        project: input.project,
        sourceAssets: input.sourceAssets,
        outputType,
        prompt
      });
      const preset = OUTPUT_PRESET_BY_ID[outputType];
      const temporaryAssetId = `${processingJob.id}_${outputType}`;
      const saved = normalizeSavedImage(
        await input.saveImage({
        assetId: temporaryAssetId,
        buffer: generated.buffer,
        mimeType: generated.mimeType,
        outputType
        })
      );
      const asset = await input.createAsset({
        kind: "generated",
        outputType,
        ...saved,
        width: preset.size.width,
        height: preset.size.height,
        mimeType: generated.mimeType,
        prompt: generated.revisedPrompt ?? prompt
      });
      assets.push(asset);
    }

    return {
      user: chargedUser,
      assets,
      job: {
        ...processingJob,
        status: "completed",
        prompt: prompts.join("\n\n---\n\n"),
        resultAssetIds: assets.map((asset) => asset.id),
        error: null,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      user: refundCredits(chargedUser, input.job.cost),
      job: failJob(processingJob, error),
      assets
    };
  }
}

function failJob(job: GenerationJob, error: unknown): GenerationJob {
  return {
    ...job,
    status: "failed",
    error: error instanceof Error ? error.message : "Generation failed",
    updatedAt: new Date().toISOString()
  };
}

function normalizeSavedImage(saved: SavedImageReference) {
  if (typeof saved === "string") {
    return {
      url: saved,
      bucketKey: null,
      publicUrl: null,
      signedUrl: null,
      storageDriver: null,
      format: null
    };
  }

  return {
    url: saved.url,
    bucketKey: saved.bucketKey ?? null,
    publicUrl: saved.publicUrl ?? null,
    signedUrl: saved.signedUrl ?? null,
    storageDriver: saved.storageDriver ?? null,
    format: saved.format ?? null
  };
}
