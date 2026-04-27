import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { processGenerationJob } from "@/lib/server/jobs";

const runSchema = z.object({
  jobId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const secret = process.env.TRIGGER_SECRET_KEY;
    const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (secret && provided !== secret) {
      return jsonError("UNAUTHORIZED", 401);
    }

    const body = runSchema.parse(await request.json());
    const result = await processGenerationJob(body.jobId);
    return NextResponse.json(result);
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
