import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { mapPersonalContext } from "@/lib/ai/personal-context";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { CYCLE_STAGES, stageLabel } from "@/lib/cycle/stages";
import { setStageAction } from "./actions";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MePage() {
  const user = await requireUser();
  const coupleId = await getOrCreateCoupleForUser(user.id);
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const pc = await mapPersonalContext(admin, coupleId);
  const current = stageLabel(pc.cycleStage ?? null);

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-semibold">나</h1>
      <section className="space-y-3">
        <h2 className="font-medium">지금 사이클 단계 {current && <span className="text-primary">· {current}</span>}</h2>
        <form action={setStageAction} className="flex flex-wrap gap-2">
          {CYCLE_STAGES.map((s) => (
            <button key={s.value} name="stage" value={s.value}
              className={`rounded-full border px-3 py-1 text-sm ${pc.cycleStage === s.value ? "border-primary text-primary" : "text-muted-foreground"}`}>
              {s.label}
            </button>
          ))}
        </form>
        <p className="text-muted-foreground text-xs">단계를 고르면 홈이 그 시기에 맞춰져요.</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">배우자와 함께</h2>
        <Button asChild variant="outline"><Link href="/couple/invite">배우자 초대하기</Link></Button>
      </section>
      <form action={logoutAction}><Button type="submit" variant="ghost">로그아웃</Button></form>
    </div>
  );
}
