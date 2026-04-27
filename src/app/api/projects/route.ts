import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { CHANNEL_PRESETS } from "@/lib/presets";
import { resolveRequestUser } from "@/lib/server/auth";
import { createProject, mutateStore } from "@/lib/server/store";

const createProjectSchema = z.object({
  productName: z.string().min(1).max(80),
  category: z.string().min(1).max(40),
  tone: z.string().min(1).max(80),
  heroCopy: z.string().min(1).max(80),
  channel: z.enum(["smartstore", "coupang", "instagram"])
});

export async function GET(request: Request) {
  try {
  const user = await resolveRequestUser(request);
  const payload = await mutateStore((data) => ({
    user,
    projects: data.projects
      .filter((project) => project.userId === user.id)
      .map((project) => ({
        ...project,
        channelLabel: CHANNEL_PRESETS[project.channel].label,
        sourceAssets: data.assets.filter((asset) => project.sourceAssetIds.includes(asset.id)),
        jobs: data.jobs.filter((job) => job.projectId === project.id)
      }))
  }));

  return NextResponse.json(payload);
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}

export async function POST(request: Request) {
  try {
    const body = createProjectSchema.parse(await request.json());
    const user = await resolveRequestUser(request);
    const project = createProject({
      userId: user.id,
      ...body
    });

    await mutateStore((data) => {
      data.projects.push(project);
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
