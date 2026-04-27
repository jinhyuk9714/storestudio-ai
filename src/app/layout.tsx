import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoreStudio AI",
  description: "한국 셀러를 위한 상품 이미지 제작 SaaS"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
