import type { Metadata } from "next";
import "./globals.css";
import "pretendard/dist/web/variable/pretendardvariable.css";
import { Toaster } from "@/components/ui/sonner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

// Geist는 Latin 폴백용으로 유지; 한국어 글리프는 Pretendard가 처리
const geist = Geist({subsets:['latin'],variable:'--font-geist-latin'});

export const metadata: Metadata = {
  title: "품 — 아이를 함께 기다리는 부부의 동반자",
  description: "IVF 시도 부부를 위한 한국 동반자 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
