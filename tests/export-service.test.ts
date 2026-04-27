import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createExportZip } from "@/lib/exports";
import type { Asset } from "@/lib/types";

describe("createExportZip", () => {
  it("exports generated assets with seller-friendly Korean filenames", async () => {
    const assets: Asset[] = [
      {
        id: "asset_1",
        userId: "user_1",
        projectId: "project_1",
        kind: "generated",
        outputType: "square-thumbnail",
        url: "/generated/asset_1.png",
        width: 1080,
        height: 1080,
        mimeType: "image/png",
        prompt: "prompt",
        createdAt: "2026-04-27T00:00:00.000Z"
      }
    ];

    const zipBuffer = await createExportZip({
      projectName: "비건 립밤",
      assets,
      readAsset: async () => Buffer.from("image")
    });
    const zip = await JSZip.loadAsync(zipBuffer);

    expect(Object.keys(zip.files)).toEqual(["비건-립밤_1x1-썸네일.png"]);
  });
});
