import { afterEach, describe, expect, it, vi } from "vitest";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

describe("R2 asset persistence runtime behavior", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not create local runtime directories when uploading to R2", async () => {
    vi.stubEnv("STORAGE_DRIVER", "r2");
    const ensureRuntimeDirs = vi.fn(async () => {
      throw new Error("LOCAL_DIR_SHOULD_NOT_BE_CREATED");
    });
    const putR2Object = vi.fn(async () => undefined);

    vi.doMock("@/lib/server/paths", () => ({
      ensureRuntimeDirs,
      UPLOAD_DIR: "/not-used/uploads",
      GENERATED_DIR: "/not-used/generated",
      publicPathFromUrl: vi.fn()
    }));
    vi.doMock("@/lib/server/storage", () => ({
      assetUrlForStorageObject: ({ bucketKey }: { bucketKey: string }) =>
        `/api/assets/${bucketKey}`,
      putR2Object,
      readAssetBufferFromStorage: vi.fn(),
      selectStorageDriverName: () => "r2"
    }));

    const { saveUploadedImage } = await import("@/lib/server/assets");
    const saved = await saveUploadedImage({
      assetId: "asset_test",
      dataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
      mimeType: "image/png"
    });

    expect(ensureRuntimeDirs).not.toHaveBeenCalled();
    expect(putR2Object).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketKey: "uploads/asset_test.png",
        contentType: "image/png"
      })
    );
    expect(saved.storageDriver).toBe("r2");
    expect(saved.url).toBe("/api/assets/uploads/asset_test.png");
  });
});
