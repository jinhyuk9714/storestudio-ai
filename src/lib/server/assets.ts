import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { GENERATED_DIR, UPLOAD_DIR, ensureRuntimeDirs, publicPathFromUrl } from "@/lib/server/paths";
import {
  assetUrlForStorageObject,
  putR2Object,
  readAssetBufferFromStorage,
  selectStorageDriverName
} from "@/lib/server/storage";
import { OUTPUT_PRESET_BY_ID } from "@/lib/presets";
import type { Asset, OutputType, Project } from "@/lib/types";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function assertAllowedImage(mimeType: string, byteLength: number): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("UNSUPPORTED_IMAGE_TYPE");
  }

  if (byteLength > 10 * 1024 * 1024) {
    throw new Error("IMAGE_TOO_LARGE");
  }
}

export async function saveUploadedImage(input: {
  assetId: string;
  dataUrl: string;
  mimeType: string;
}): Promise<{
  url: string;
  bucketKey: string | null;
  publicUrl: string | null;
  signedUrl: string | null;
  storageDriver: "local" | "r2";
  format: "jpg" | "png" | "webp";
  width: number;
  height: number;
  buffer: Buffer;
}> {
  await ensureRuntimeDirs();
  const buffer = bufferFromDataUrl(input.dataUrl);
  assertAllowedImage(input.mimeType, buffer.byteLength);

  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();
  const extension = extensionForMime(input.mimeType);
  const fileName = `${input.assetId}.${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const normalized = await image.toFormat(extension === "jpg" ? "jpeg" : extension).toBuffer();
  const storageDriver = selectStorageDriverName();

  if (storageDriver === "r2") {
    const bucketKey = `uploads/${fileName}`;
    const publicUrl = process.env.R2_PUBLIC_BASE_URL
      ? assetUrlForStorageObject({ driver: "r2", bucketKey })
      : null;
    await putR2Object({
      bucketKey,
      body: normalized,
      contentType: input.mimeType
    });
    return {
      url: assetUrlForStorageObject({ driver: "r2", bucketKey }),
      bucketKey,
      publicUrl,
      signedUrl: null,
      storageDriver,
      format: extension,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      buffer: normalized
    };
  }

  await writeFile(filePath, normalized);

  return {
    url: `/uploads/${fileName}`,
    bucketKey: `uploads/${fileName}`,
    publicUrl: null,
    signedUrl: null,
    storageDriver,
    format: extension,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    buffer: normalized
  };
}

export async function saveGeneratedImage(input: {
  assetId: string;
  buffer: Buffer;
  mimeType: string;
  outputType: OutputType;
  project: Project;
  watermark: boolean;
}): Promise<{
  url: string;
  bucketKey: string | null;
  publicUrl: string | null;
  signedUrl: string | null;
  storageDriver: "local" | "r2";
  format: "png";
}> {
  await ensureRuntimeDirs();
  const preset = OUTPUT_PRESET_BY_ID[input.outputType];
  const composed = await composeSellerImage({
    base: input.buffer,
    width: preset.size.width,
    height: preset.size.height,
    productName: input.project.productName,
    heroCopy: input.project.heroCopy,
    outputType: input.outputType,
    watermark: input.watermark
  });
  const fileName = `${input.assetId}.png`;
  const storageDriver = selectStorageDriverName();

  if (storageDriver === "r2") {
    const bucketKey = `generated/${fileName}`;
    const publicUrl = process.env.R2_PUBLIC_BASE_URL
      ? assetUrlForStorageObject({ driver: "r2", bucketKey })
      : null;
    await putR2Object({
      bucketKey,
      body: composed,
      contentType: "image/png"
    });
    return {
      url: assetUrlForStorageObject({ driver: "r2", bucketKey }),
      bucketKey,
      publicUrl,
      signedUrl: null,
      storageDriver,
      format: "png"
    };
  }

  await writeFile(path.join(GENERATED_DIR, fileName), composed);
  return {
    url: `/generated/${fileName}`,
    bucketKey: `generated/${fileName}`,
    publicUrl: null,
    signedUrl: null,
    storageDriver,
    format: "png"
  };
}

export async function readAssetBuffer(asset: Asset): Promise<Buffer> {
  if (asset.storageDriver === "r2" || asset.url.startsWith("/api/assets/")) {
    return readAssetBufferFromStorage(asset);
  }
  return readFile(publicPathFromUrl(asset.url));
}

export async function createMockProductImage(input: {
  project: Project;
  outputType: OutputType;
}): Promise<Buffer> {
  const preset = OUTPUT_PRESET_BY_ID[input.outputType];
  const hue = {
    "white-background": "#f7f3ec",
    "square-thumbnail": "#e8f0ed",
    lifestyle: "#f0e6dc",
    "detail-hero": "#e7edf4"
  }[input.outputType];
  const svg = `
    <svg width="${preset.size.width}" height="${preset.size.height}" viewBox="0 0 ${preset.size.width} ${preset.size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${hue}"/>
      <rect x="${preset.size.width * 0.18}" y="${preset.size.height * 0.16}" width="${preset.size.width * 0.46}" height="${preset.size.height * 0.68}" rx="32" fill="#ffffff" opacity="0.82"/>
      <rect x="${preset.size.width * 0.25}" y="${preset.size.height * 0.24}" width="${preset.size.width * 0.32}" height="${preset.size.height * 0.43}" rx="26" fill="#d5b48c"/>
      <circle cx="${preset.size.width * 0.42}" cy="${preset.size.height * 0.38}" r="${Math.min(preset.size.width, preset.size.height) * 0.08}" fill="#23302f" opacity="0.12"/>
      <text x="${preset.size.width * 0.1}" y="${preset.size.height * 0.9}" font-family="Arial, sans-serif" font-size="${Math.max(28, preset.size.width * 0.034)}" fill="#26302f" opacity="0.52">StoreStudio AI mock render</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function composeSellerImage(input: {
  base: Buffer;
  width: number;
  height: number;
  productName: string;
  heroCopy: string;
  outputType: OutputType;
  watermark: boolean;
}): Promise<Buffer> {
  const base = await sharp(input.base)
    .resize(input.width, input.height, { fit: "cover", position: "center" })
    .png()
    .toBuffer();
  const overlay = Buffer.from(createOverlaySvg(input));

  return sharp(base)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function createOverlaySvg(input: {
  width: number;
  height: number;
  productName: string;
  heroCopy: string;
  outputType: OutputType;
  watermark: boolean;
}): string {
  const padding = Math.round(input.width * 0.07);
  const titleSize = Math.max(36, Math.round(input.width * 0.052));
  const copySize = Math.max(24, Math.round(input.width * 0.026));
  const badgeSize = Math.max(17, Math.round(input.width * 0.016));
  const title = escapeSvg(truncate(input.productName, 22));
  const copy = escapeSvg(truncate(input.heroCopy, 32));
  const outputLabel = escapeSvg(OUTPUT_PRESET_BY_ID[input.outputType].label);
  const watermark = input.watermark
    ? `<text x="${padding}" y="${input.height - padding}" font-family="Arial, sans-serif" font-size="${badgeSize}" fill="#1b2524" opacity="0.45">StoreStudio AI preview</text>`
    : "";

  return `
    <svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.42"/>
          <stop offset="54%" stop-color="#000000" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#shade)"/>
      <text x="${padding}" y="${padding + badgeSize}" font-family="Arial, sans-serif" font-size="${badgeSize}" fill="#ffffff" opacity="0.78">${outputLabel}</text>
      <text x="${padding}" y="${padding + badgeSize + titleSize + 22}" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="700" fill="#ffffff">${title}</text>
      <text x="${padding}" y="${padding + badgeSize + titleSize + copySize + 42}" font-family="Arial, sans-serif" font-size="${copySize}" fill="#ffffff" opacity="0.88">${copy}</text>
      ${watermark}
    </svg>
  `;
}

function bufferFromDataUrl(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) {
    throw new Error("INVALID_DATA_URL");
  }
  return Buffer.from(match[1], "base64");
}

function extensionForMime(mimeType: string): "jpg" | "png" | "webp" {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
}

function escapeSvg(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
