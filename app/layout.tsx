import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Popit — 매일 새로운 사물을 흔들어라!",
  description: "15초 동안 사물을 잡고 흔들어 아이템을 최대한 많이 떨어뜨리세요. Zero-friction Daily Shake Game.",
  openGraph: {
    title: "Popit — 15초 데일리 쉐이크 게임",
    description: "오늘의 사물: 오레오 BTS 호떡맛 에디션! 과연 몇 개나 꺼낼 수 있을까?",
    images: ["/assets/oreo_box.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased selection:bg-purple-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

