import type { ChannelId, OutputType } from "@/lib/types";

export type SizePreset = {
  width: number;
  height: number;
};

export type OutputPreset = {
  id: OutputType;
  label: string;
  shortLabel: string;
  intent: string;
  size: SizePreset;
};

export const OUTPUT_PRESETS: OutputPreset[] = [
  {
    id: "white-background",
    label: "흰 배경 상품컷",
    shortLabel: "흰배경",
    intent: "clean catalog image on a seamless white background",
    size: { width: 1200, height: 1200 }
  },
  {
    id: "square-thumbnail",
    label: "1:1 썸네일",
    shortLabel: "1x1 썸네일",
    intent: "square ecommerce thumbnail with strong product visibility",
    size: { width: 1080, height: 1080 }
  },
  {
    id: "lifestyle",
    label: "라이프스타일 컷",
    shortLabel: "라이프스타일",
    intent: "lifestyle product photography in a realistic use context",
    size: { width: 1080, height: 1350 }
  },
  {
    id: "detail-hero",
    label: "상세페이지 첫 화면",
    shortLabel: "상세 히어로",
    intent: "wide hero image for the first section of a Korean product detail page",
    size: { width: 1600, height: 900 }
  }
];

export const OUTPUT_PRESET_BY_ID = Object.fromEntries(
  OUTPUT_PRESETS.map((preset) => [preset.id, preset])
) as Record<OutputType, OutputPreset>;

export const CHANNEL_PRESETS: Record<
  ChannelId,
  {
    label: string;
    sizes: {
      thumbnail: SizePreset;
      detailHero: SizePreset;
      feed: SizePreset;
    };
  }
> = {
  smartstore: {
    label: "네이버 스마트스토어",
    sizes: {
      thumbnail: { width: 1080, height: 1080 },
      detailHero: { width: 1600, height: 900 },
      feed: { width: 1080, height: 1350 }
    }
  },
  coupang: {
    label: "쿠팡",
    sizes: {
      thumbnail: { width: 1080, height: 1080 },
      detailHero: { width: 1600, height: 900 },
      feed: { width: 1080, height: 1350 }
    }
  },
  instagram: {
    label: "인스타그램",
    sizes: {
      thumbnail: { width: 1080, height: 1080 },
      detailHero: { width: 1600, height: 900 },
      feed: { width: 1080, height: 1350 }
    }
  }
};

export const DEFAULT_OUTPUT_TYPES = OUTPUT_PRESETS.map((preset) => preset.id);
