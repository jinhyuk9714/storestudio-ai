import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { createWaitlistSignup, mutateStore } from "@/lib/server/store";

const waitlistSchema = z.object({
  email: z.string().email(),
  storeUrl: z.string().url().optional().or(z.literal("")).transform((value) => value || null)
});

export async function POST(request: Request) {
  try {
    const body = waitlistSchema.parse(await request.json());
    const signup = createWaitlistSignup(body);

    await mutateStore((data) => {
      const existing = data.waitlist.find((candidate) => candidate.email === signup.email);
      if (!existing) {
        data.waitlist.push(signup);
      }
    });

    return NextResponse.json({ signup }, { status: 201 });
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
