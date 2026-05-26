import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { mapPersonalContext } from "@/lib/ai/personal-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { stageLabel } from "@/lib/cycle/stages";
import { articlesForStage, listArticles } from "@/lib/content/articles";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function HomePage() {
  const user = await requireUser();
  const coupleId = await getOrCreateCoupleForUser(user.id);
  const admin = createAdminClient();
  const pc = await mapPersonalContext(admin, coupleId);
  const label = stageLabel(pc.cycleStage ?? null);
  const recommended = pc.cycleStage ? articlesForStage(pc.cycleStage) : listArticles().slice(0, 4);

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">안녕하세요 🌿</h1>
        <p className="text-muted-foreground">
          {label ? `지금은 ${label} 시기예요. 오늘도 곁에 있을게요.` : "오늘도 곁에 있을게요."}
        </p>
      </header>

      <Card>
        <CardHeader><h2 className="font-medium">💬 오늘 마음은요?</h2></CardHeader>
        <CardContent><Button asChild><Link href="/chat">대화하기</Link></Button></CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-medium">지금 도움될 이야기</h2>
        {recommended.length === 0 ? (
          <p className="text-muted-foreground text-sm">곧 더 많은 이야기를 준비할게요.</p>
        ) : (
          <ul className="space-y-2">
            {recommended.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="hover:bg-muted block rounded-lg border p-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground text-sm">{a.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!pc.cycleStage && (
          <p className="text-muted-foreground text-xs">
            <Link href="/me" className="underline">사이클 단계를 설정</Link>하면 더 맞춰드려요.
          </p>
        )}
      </section>
    </div>
  );
}
