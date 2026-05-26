import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import { BottomTabs } from "@/components/nav/BottomTabs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-md items-center p-4">
          <Link href="/home" className="text-xl font-semibold">
            품
          </Link>
        </div>
      </header>
      <main className="mx-auto min-h-screen max-w-md px-4 pb-20">{children}</main>
      <BottomTabs />
    </div>
  );
}
