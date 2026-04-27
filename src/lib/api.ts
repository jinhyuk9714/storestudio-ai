import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function parseJsonError(error: unknown): { message: string; status: number } {
  if (error instanceof Error) {
    const status =
      error.message === "INSUFFICIENT_CREDITS"
        ? 402
        : error.message === "UNAUTHORIZED"
          ? 401
          : error.message.endsWith("_NOT_FOUND")
            ? 404
            : 400;
    return { message: error.message, status };
  }
  return { message: "UNKNOWN_ERROR", status: 500 };
}
