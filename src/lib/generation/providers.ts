import OpenAI, { toFile } from "openai";
import { createMockProductImage, readAssetBuffer } from "@/lib/server/assets";
import type { ProductImageProvider, ProductImageRequest, ProductImageResult } from "@/lib/generation/service";

export function createImageProvider(): ProductImageProvider {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIImageProvider();
  }

  return new MockImageProvider();
}

class OpenAIImageProvider implements ProductImageProvider {
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  async generateProductImage(request: ProductImageRequest): Promise<ProductImageResult> {
    const sourceImages = await Promise.all(
      request.sourceAssets.slice(0, 5).map(async (asset) =>
        toFile(await readAssetBuffer(asset), `${asset.id}.png`, {
          type: asset.mimeType
        })
      )
    );

    if (sourceImages.length > 0) {
      const response = await this.client.images.edit({
        model: "gpt-image-2" as never,
        image: sourceImages as never,
        prompt: request.prompt
      });
      const base64 = response.data?.[0]?.b64_json;
      if (!base64) {
        throw new Error("OPENAI_EMPTY_IMAGE_RESPONSE");
      }
      return {
        buffer: Buffer.from(base64, "base64"),
        mimeType: "image/png",
        revisedPrompt: response.data?.[0]?.revised_prompt ?? request.prompt
      };
    }

    const response = await this.client.images.generate({
      model: "gpt-image-2" as never,
      prompt: request.prompt
    });
    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("OPENAI_EMPTY_IMAGE_RESPONSE");
    }
    return {
      buffer: Buffer.from(base64, "base64"),
      mimeType: "image/png",
      revisedPrompt: response.data?.[0]?.revised_prompt ?? request.prompt
    };
  }
}

class MockImageProvider implements ProductImageProvider {
  async generateProductImage(request: ProductImageRequest): Promise<ProductImageResult> {
    return {
      buffer: await createMockProductImage({
        project: request.project,
        outputType: request.outputType
      }),
      mimeType: "image/png",
      revisedPrompt: `${request.prompt}\n\n[Mock image generated because OPENAI_API_KEY is not set.]`
    };
  }
}
