import { describe, expect, it } from "vitest";
import { assertAllowedImage } from "@/lib/server/assets";
import { assetUrlForStorageObject, selectStorageDriverName } from "@/lib/server/storage";

describe("storage adapter configuration", () => {
  it("uses local storage by default outside production", () => {
    expect(selectStorageDriverName({ NODE_ENV: "development" })).toBe("local");
  });

  it("uses R2 as the production default when not explicitly overridden", () => {
    expect(selectStorageDriverName({ NODE_ENV: "production" })).toBe("r2");
  });

  it("builds an app-served R2 asset URL when no public CDN base URL is configured", () => {
    expect(
      assetUrlForStorageObject({
        driver: "r2",
        bucketKey: "generated/user_1/job_1/result.png"
      })
    ).toBe("/api/assets/generated/user_1/job_1/result.png");
  });

  it("allows source images up to 10MB", () => {
    expect(() => assertAllowedImage("image/png", 10 * 1024 * 1024)).not.toThrow();
  });
});
