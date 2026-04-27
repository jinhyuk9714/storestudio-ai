import { NextResponse } from "next/server";
import { jsonError, parseJsonError } from "@/lib/api";
import { resolveRequestUser } from "@/lib/server/auth";
import { readStore } from "@/lib/server/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await resolveRequestUser(request);
    const data = await readStore();
    const job = data.jobs.find((candidate) => candidate.id === id && candidate.userId === user.id);

    if (!job) {
      return jsonError("JOB_NOT_FOUND", 404);
    }

    const assets = data.assets.filter((asset) => job.resultAssetIds.includes(asset.id));
    return NextResponse.json({ job, assets });
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
