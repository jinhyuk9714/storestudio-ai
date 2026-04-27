import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { createExportZip, slugifyKorean } from "@/lib/exports";
import { readAssetBuffer } from "@/lib/server/assets";
import { resolveRequestUser } from "@/lib/server/auth";
import { readStore } from "@/lib/server/store";

const exportSchema = z.object({
  projectId: z.string().min(1),
  jobId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  try {
    const body = exportSchema.parse(await request.json());
    const user = await resolveRequestUser(request);
    const data = await readStore();
    const project = data.projects.find(
      (candidate) => candidate.id === body.projectId && candidate.userId === user.id
    );

    if (!project) {
      return jsonError("PROJECT_NOT_FOUND", 404);
    }

    const job = body.jobId
      ? data.jobs.find((candidate) => candidate.id === body.jobId && candidate.projectId === project.id)
      : data.jobs
          .filter((candidate) => candidate.projectId === project.id && candidate.status === "completed")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const assetIds = job?.resultAssetIds ?? [];
    const assets = data.assets.filter((asset) => assetIds.includes(asset.id));

    if (assets.length === 0) {
      return jsonError("NO_EXPORTABLE_ASSETS", 404);
    }

    const zip = await createExportZip({
      projectName: project.productName,
      assets,
      readAsset: readAssetBuffer
    });

    const asciiFileName = "storestudio-export.zip";
    const encodedFileName = encodeURIComponent(`${slugifyKorean(project.productName)}-storestudio.zip`);

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`
      }
    });
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
