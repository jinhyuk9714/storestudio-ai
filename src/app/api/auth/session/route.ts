import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonError } from "@/lib/api";
import { sendSupabaseMagicLink } from "@/lib/server/auth";

const sessionSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const body = sessionSchema.parse(await request.json());
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const result = await sendSupabaseMagicLink({
      email: body.email,
      redirectTo: origin
    });

    return NextResponse.json(result);
  } catch (error) {
    const parsed = parseJsonError(error);
    return jsonError(parsed.message, parsed.status);
  }
}
