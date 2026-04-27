import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { resolveRequestUser } from "@/lib/server/auth";
import { saveUploadedImage } from "@/lib/server/assets";
import { createSourceAsset, mutateStore } from "@/lib/server/store";

const uploadSchema = z.object({
  projectId: z.string().min(1),
  fileName: z.string().min(1).max(160),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataUrl: z.string().min(32)
});

export async function POST(request: Request) {
  try {
    const body = uploadSchema.parse(await request.json());
    const user = await resolveRequestUser(request);
    const sourceId = `asset_${randomUUID()}`;
    const saved = await mutateStore((data) => {
      const project = data.projects.find(
        (candidate) => candidate.id === body.projectId && candidate.userId === user.id
      );
      if (!project) {
        throw new Error("PROJECT_NOT_FOUND");
      }
      if (project.sourceAssetIds.length >= 5) {
        throw new Error("SOURCE_IMAGE_LIMIT_EXCEEDED");
      }
    }).then(() =>
      saveUploadedImage({
        assetId: sourceId,
        dataUrl: body.dataUrl,
        mimeType: body.mimeType
      })
    );

    const asset = createSourceAsset({
      id: sourceId,
      userId: user.id,
      projectId: body.projectId,
      url: saved.url,
      bucketKey: saved.bucketKey,
      publicUrl: saved.publicUrl,
      signedUrl: saved.signedUrl,
      storageDriver: saved.storageDriver,
      format: saved.format,
      width: saved.width,
      height: saved.height,
      mimeType: body.mimeType
    });

    await mutateStore((data) => {
      const project = data.projects.find(
        (candidate) => candidate.id === body.projectId && candidate.userId === user.id
      );
      if (!project) {
        throw new Error("PROJECT_NOT_FOUND");
      }
      data.assets.push(asset);
      project.sourceAssetIds.push(asset.id);
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
