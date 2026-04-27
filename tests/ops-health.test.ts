import { describe, expect, it } from "vitest";
import { buildOpsHealthReport } from "@/lib/server/ops-health";

describe("buildOpsHealthReport", () => {
  it("reports missing third-party credentials without exposing values", () => {
    const report = buildOpsHealthReport({
      NODE_ENV: "production",
      DATA_DRIVER: "supabase",
      STORAGE_DRIVER: "r2",
      JOB_DRIVER: "trigger",
      AUTH_REQUIRED: "true",
      ADMIN_TOKEN: "secret-admin-token",
      OPENAI_API_KEY: "sk-secret"
    });

    expect(report.productionReady).toBe(false);
    expect(report.configuredSecrets).toEqual(["OPENAI_API_KEY", "ADMIN_TOKEN"]);
    expect(report.missingSecrets).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(report.missingSecrets).toContain("R2_SECRET_ACCESS_KEY");
    expect(report.missingSecrets).toContain("TRIGGER_SECRET_KEY");
    expect(JSON.stringify(report)).not.toContain("secret-admin-token");
    expect(JSON.stringify(report)).not.toContain("sk-secret");
  });

  it("marks production ready when every required external credential is configured", () => {
    const report = buildOpsHealthReport({
      NODE_ENV: "production",
      DATA_DRIVER: "supabase",
      STORAGE_DRIVER: "r2",
      JOB_DRIVER: "trigger",
      AUTH_REQUIRED: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "access",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "bucket",
      R2_PUBLIC_BASE_URL: "https://assets.example.com",
      TRIGGER_SECRET_KEY: "trigger",
      TRIGGER_GENERATION_TASK_URL: "https://trigger.example.com",
      TOSS_SECRET_KEY: "test_sk",
      OPENAI_API_KEY: "sk-openai",
      ADMIN_TOKEN: "admin"
    });

    expect(report.productionReady).toBe(true);
    expect(report.missingSecrets).toEqual([]);
  });
});
