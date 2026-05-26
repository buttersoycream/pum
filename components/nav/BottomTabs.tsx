"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/articles", label: "글", icon: "📚" },
  { href: "/chat", label: "대화", icon: "💬" },
  { href: "/me", label: "나", icon: "👤" },
];

export function BottomTabs() {
  const path = usePathname();
  return (
    <nav aria-label="메인 메뉴" className="bg-background/95 fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t backdrop-blur sm:mx-auto sm:max-w-md">
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
            <span className="text-lg">{t.icon}</span>{t.label}
          </Link>
        );
      })}
    </nav>
  );
}
