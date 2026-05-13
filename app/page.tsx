import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-semibold tracking-tight">품</h1>
      <p className="text-muted-foreground max-w-md text-center">
        아이를 함께 기다리는 부부의 IVF 동반자.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">시작하기</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">로그인</Link>
        </Button>
      </div>
    </main>
  );
}
