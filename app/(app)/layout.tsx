import { requireUser } from "@/lib/auth/current-user";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-semibold">
              품
            </Link>
            <Link
              href="/chat"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              AI 동반자
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden max-w-[180px] truncate text-sm sm:inline-block">
              {user.email}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
