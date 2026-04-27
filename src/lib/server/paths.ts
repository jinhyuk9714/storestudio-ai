import path from "node:path";
import { mkdir } from "node:fs/promises";

export const ROOT_DIR = process.cwd();
export const DATA_DIR = path.join(ROOT_DIR, ".data");
export const STORE_PATH = path.join(DATA_DIR, "store.json");
export const PUBLIC_DIR = path.join(ROOT_DIR, "public");
export const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
export const GENERATED_DIR = path.join(PUBLIC_DIR, "generated");

export async function ensureRuntimeDirs(): Promise<void> {
  await Promise.all([
    mkdir(DATA_DIR, { recursive: true }),
    mkdir(UPLOAD_DIR, { recursive: true }),
    mkdir(GENERATED_DIR, { recursive: true })
  ]);
}

export function publicPathFromUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    return path.join(PUBLIC_DIR, url);
  }
  if (url.startsWith("/generated/")) {
    return path.join(PUBLIC_DIR, url);
  }
  throw new Error(`Unsupported local asset URL: ${url}`);
}
