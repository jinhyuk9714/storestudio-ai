import { CHANNEL_PRESETS, OUTPUT_PRESET_BY_ID } from "@/lib/presets";
import type { ChannelId, OutputType } from "@/lib/types";

export type PromptInput = {
  productName: string;
  category: string;
  tone: string;
  channel: ChannelId;
  heroCopy: string;
  outputType: OutputType;
};

export function buildImagePrompt(input: PromptInput): string {
  const channel = CHANNEL_PRESETS[input.channel];
  const output = OUTPUT_PRESET_BY_ID[input.outputType];

  return [
    "Korean ecommerce product photography for a seller-ready product listing.",
    `Product: ${input.productName}.`,
    `Category: ${input.category}.`,
    `Target channel: ${channel.label}.`,
    `Output type: ${input.outputType} - ${output.intent}.`,
    `Mood and art direction: ${input.tone}.`,
    `Commercial message to support: ${input.heroCopy}.`,
    "Preserve the product as the hero, with realistic material detail and clean lighting.",
    "Do not render Korean text, pricing, badges, logos, UI, watermarks, or fake brand names inside the generated image.",
    "leave clean negative space for Korean copy overlays and server-rendered promotional labels.",
    "No distorted product geometry. No extra duplicate products unless the scene clearly benefits from a small arrangement."
  ].join("\n");
}
