import { requireUser } from "@/lib/auth/current-user";
import { getCoupleForUser, getPartner } from "@/lib/couple/queries";
import { PartnerCard } from "@/components/couple/PartnerCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUser();
  const coupleId = await getCoupleForUser(user.id);
  const partner = coupleId ? await getPartner(coupleId, user.id) : null;
  const partnerEmail =
    (partner?.profiles as { email?: string } | undefined)?.email ?? null;

  return (
    <div className="space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold">환영합니다</h1>
        <p className="text-muted-foreground">
          {coupleId ? "함께 시작합시다." : "먼저 배우자를 초대해주세요."}
        </p>
      </div>

      <PartnerCard hasPartner={!!partnerEmail} partnerEmail={partnerEmail} />

      {!coupleId && (
        <Button asChild>
          <Link href="/couple/invite">배우자 초대하기</Link>
        </Button>
      )}
    </div>
  );
}
