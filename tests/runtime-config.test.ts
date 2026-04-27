import { describe, expect, it } from "vitest";
import { isDemoAuthAllowed } from "@/lib/server/auth";
import { selectJobDriverName } from "@/lib/server/jobs";

describe("runtime config", () => {
  it("blocks the demo user in production unless explicitly disabled", () => {
    expect(isDemoAuthAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(isDemoAuthAllowed({ NODE_ENV: "production", AUTH_REQUIRED: "false" })).toBe(true);
  });

  it("uses Trigger.dev as the production job driver by default", () => {
    expect(selectJobDriverName({ NODE_ENV: "production" })).toBe("trigger");
    expect(selectJobDriverName({ NODE_ENV: "development" })).toBe("local");
    expect(selectJobDriverName({ NODE_ENV: "production", JOB_DRIVER: "local" })).toBe("local");
  });
});
