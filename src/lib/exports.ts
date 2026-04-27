import JSZip from "jszip";
import { OUTPUT_PRESET_BY_ID } from "@/lib/presets";
import type { Asset } from "@/lib/types";

export type CreateExportZipInput = {
  projectName: string;
  assets: Asset[];
  readAsset(asset: Asset): Promise<Buffer>;
};

const EXPORT_LABELS = {
  "white-background": "흰배경-상품컷",
  "square-thumbnail": "1x1-썸네일",
  lifestyle: "라이프스타일",
  "detail-hero": "상세페이지-첫화면"
} as const;

export async function createExportZip(input: CreateExportZipInput): Promise<Buffer> {
  const zip = new JSZip();
  const safeProjectName = slugifyKorean(input.projectName);

  for (const asset of input.assets) {
    if (!asset.outputType) {
      continue;
    }

    const extension = extensionForMime(asset.mimeType);
    const label = EXPORT_LABELS[asset.outputType] ?? OUTPUT_PRESET_BY_ID[asset.outputType].shortLabel;
    const data = await input.readAsset(asset);
    zip.file(`${safeProjectName}_${label}.${extension}`, data);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

export function slugifyKorean(value: string): string {
  return value
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function extensionForMime(mimeType: string): "png" | "jpg" | "webp" {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
}
