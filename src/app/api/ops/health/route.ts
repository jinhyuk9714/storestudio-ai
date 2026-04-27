import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { buildOpsHealthReport } from "@/lib/server/ops-health";

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!adminToken || providedToken !== adminToken) {
    return jsonError("UNAUTHORIZED", 401);
  }

  return NextResponse.json(buildOpsHealthReport());
}
