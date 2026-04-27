import { ensureUser, getDemoUser } from "@/lib/server/store";
import type { UserAccount } from "@/lib/types";

type EnvShape = Partial<
  Pick<
    NodeJS.ProcessEnv,
    "NODE_ENV" | "AUTH_REQUIRED" | "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  >
>;

export class AuthError extends Error {
  constructor(message = "UNAUTHORIZED") {
    super(message);
    this.name = "AuthError";
  }
}

export function isDemoAuthAllowed(env: EnvShape = process.env): boolean {
  if (env.AUTH_REQUIRED === "false") {
    return true;
  }
  return env.NODE_ENV !== "production";
}

export async function resolveRequestUser(request: Request): Promise<UserAccount> {
  const token = bearerTokenFromRequest(request);

  if (token) {
    const verified = await verifySupabaseAccessToken(token);
    return ensureUser(verified.email, verified.id);
  }

  if (isDemoAuthAllowed()) {
    return getDemoUser();
  }

  throw new AuthError();
}

export async function sendSupabaseMagicLink(input: {
  email: string;
  redirectTo: string;
}): Promise<{ mode: "local" | "supabase"; sent: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    await ensureUser(input.email);
    return { mode: "local", sent: false };
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      create_user: true,
      options: {
        email_redirect_to: input.redirectTo
      }
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.msg ?? payload?.message ?? "SUPABASE_MAGIC_LINK_FAILED");
  }

  return { mode: "supabase", sent: true };
}

async function verifySupabaseAccessToken(token: string): Promise<{ id: string; email: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new AuthError("SUPABASE_AUTH_NOT_CONFIGURED");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new AuthError();
  }

  const payload = (await response.json()) as { id?: string; email?: string };
  if (!payload.id || !payload.email) {
    throw new AuthError("SUPABASE_USER_INVALID");
  }

  return {
    id: `user_${payload.id}`,
    email: payload.email
  };
}

function bearerTokenFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice("bearer ".length).trim() || null;
}
