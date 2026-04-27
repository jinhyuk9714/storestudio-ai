import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "public", "demo");
await mkdir(outDir, { recursive: true });

const assets = [
  ["white-background.png", 1200, 1200, "#f6f1ea", "#d5b48c", "WHITE CUT"],
  ["square-thumbnail.png", 1080, 1080, "#e8f0ed", "#1c8f73", "THUMB"],
  ["lifestyle.png", 1080, 1350, "#f0e6dc", "#da6d56", "LIFESTYLE"],
  ["detail-hero.png", 1600, 900, "#e7edf4", "#253b55", "DETAIL HERO"]
];

for (const [name, width, height, bg, accent, label] of assets) {
  await writeFile(
    path.join(outDir, name),
    await sharp(Buffer.from(productSvg({ width, height, bg, accent, label })))
      .png()
      .toBuffer()
  );
}

await writeFile(
  path.join(outDir, "hero-studio.png"),
  await sharp(Buffer.from(heroSvg()))
    .png()
    .toBuffer()
);

function productSvg({ width, height, bg, accent, label }) {
  const productW = width * 0.28;
  const productH = height * 0.42;
  const x = width * 0.48;
  const y = height * 0.22;
  const font = Math.max(28, width * 0.035);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bg}"/>
      <path d="M0 ${height * 0.72} C ${width * 0.28} ${height * 0.58}, ${width * 0.56} ${height * 0.88}, ${width} ${height * 0.7} L ${width} ${height} L 0 ${height} Z" fill="${accent}" opacity="0.14"/>
      <rect x="${x}" y="${y}" width="${productW}" height="${productH}" rx="${Math.min(width, height) * 0.035}" fill="#fffaf2"/>
      <rect x="${x + productW * 0.18}" y="${y - productH * 0.12}" width="${productW * 0.64}" height="${productH * 0.16}" rx="14" fill="#26302f"/>
      <rect x="${x + productW * 0.16}" y="${y + productH * 0.18}" width="${productW * 0.68}" height="${productH * 0.42}" rx="18" fill="${accent}" opacity="0.72"/>
      <circle cx="${x + productW * 0.5}" cy="${y + productH * 0.39}" r="${productW * 0.13}" fill="#ffffff" opacity="0.35"/>
      <text x="${width * 0.08}" y="${height * 0.17}" font-family="Arial, sans-serif" font-size="${font}" font-weight="700" fill="#17211f">${label}</text>
      <text x="${width * 0.08}" y="${height * 0.17 + font * 1.35}" font-family="Arial, sans-serif" font-size="${font * 0.56}" fill="#63706b">StoreStudio AI sample</text>
    </svg>
  `;
}

function heroSvg() {
  return `
    <svg width="2200" height="1400" viewBox="0 0 2200 1400" xmlns="http://www.w3.org/2000/svg">
      <rect width="2200" height="1400" fill="#e7edf4"/>
      <rect x="1120" y="180" width="720" height="920" rx="64" fill="#fffaf2"/>
      <rect x="1264" y="306" width="428" height="610" rx="42" fill="#d5b48c"/>
      <rect x="1334" y="214" width="288" height="100" rx="34" fill="#253b55"/>
      <circle cx="1478" cy="602" r="108" fill="#ffffff" opacity="0.32"/>
      <path d="M900 980 C 1140 790, 1460 1160, 2200 900 L 2200 1400 L 0 1400 L 0 1060 C 280 1180, 570 1190, 900 980 Z" fill="#1c8f73" opacity="0.18"/>
      <path d="M1300 1240 C 1580 1040, 1790 1180, 2200 1060 L 2200 1400 L 940 1400 C 1060 1350, 1170 1320, 1300 1240 Z" fill="#da6d56" opacity="0.16"/>
      <rect x="184" y="1030" width="562" height="138" rx="36" fill="#fffaf2" opacity="0.92"/>
      <rect x="226" y="1074" width="190" height="24" rx="12" fill="#1c8f73"/>
      <rect x="226" y="1120" width="410" height="18" rx="9" fill="#253b55" opacity="0.3"/>
    </svg>
  `;
}
