import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { readR2Object } from "@/lib/server/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await context.params;
    const bucketKey = key.join("/");
    const buffer = await readR2Object(bucketKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeForKey(bucketKey),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "ASSET_NOT_FOUND", 404);
  }
}

function contentTypeForKey(key: string): string {
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (key.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/png";
}
