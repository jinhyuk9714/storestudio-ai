import { describe, expect, it } from "vitest";
import { buildImagePrompt } from "@/lib/prompts";

describe("buildImagePrompt", () => {
  it("turns product options into a commerce-focused prompt", () => {
    const prompt = buildImagePrompt({
      productName: "세라믹 머그컵",
      category: "생활잡화",
      tone: "따뜻하고 미니멀",
      channel: "smartstore",
      heroCopy: "매일 쓰는 편안한 컵",
      outputType: "lifestyle"
    });

    expect(prompt).toContain("세라믹 머그컵");
    expect(prompt).toContain("생활잡화");
    expect(prompt).toContain("lifestyle");
    expect(prompt).toContain("Korean ecommerce product photography");
  });

  it("keeps Korean text out of generated imagery so the server can render labels", () => {
    const prompt = buildImagePrompt({
      productName: "비건 립밤",
      category: "화장품",
      tone: "깨끗하고 프리미엄",
      channel: "coupang",
      heroCopy: "건조한 입술을 위한 보습",
      outputType: "detail-hero"
    });

    expect(prompt).toContain("Do not render Korean text");
    expect(prompt).toContain("leave clean negative space for Korean copy overlays");
  });
});
