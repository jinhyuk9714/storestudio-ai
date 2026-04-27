import { describe, expect, it } from "vitest";
import { CHANNEL_PRESETS, OUTPUT_PRESETS } from "@/lib/presets";

describe("StoreStudio presets", () => {
  it("locks MVP to four output types", () => {
    expect(OUTPUT_PRESETS.map((preset) => preset.id)).toEqual([
      "white-background",
      "square-thumbnail",
      "lifestyle",
      "detail-hero"
    ]);
  });

  it("contains Korean seller channel sizes", () => {
    expect(CHANNEL_PRESETS.smartstore.sizes.thumbnail).toEqual({
      width: 1080,
      height: 1080
    });
    expect(CHANNEL_PRESETS.coupang.sizes.detailHero).toEqual({
      width: 1600,
      height: 900
    });
    expect(CHANNEL_PRESETS.instagram.sizes.feed).toEqual({
      width: 1080,
      height: 1350
    });
  });
});
