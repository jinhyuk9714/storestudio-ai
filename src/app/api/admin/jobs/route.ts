import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { readStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (process.env.NODE_ENV === "production" && (!adminToken || providedToken !== adminToken)) {
    return jsonError("UNAUTHORIZED", 401);
  }

  const data = await readStore();
  const refundedJobIds = new Set(
    data.creditLedger
      .filter((entry) => entry.reason === "generation_refund" && entry.jobId)
      .map((entry) => entry.jobId)
  );
  const jobs = data.jobs
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100)
    .map((job) => {
      const project = data.projects.find((candidate) => candidate.id === job.projectId);
      const user = data.users.find((candidate) => candidate.id === job.userId);
      return {
        ...job,
        productName: project?.productName ?? null,
        userEmail: user?.email ?? null,
        refunded: refundedJobIds.has(job.id)
      };
    });

  return NextResponse.json({ jobs });
}
