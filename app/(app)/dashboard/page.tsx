import { requireUser } from "@/lib/auth/current-user";
import { getCoupleForUser, getPartner } from "@/lib/couple/queries";
import { PartnerCard } from "@/components/couple/PartnerCard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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
          {coupleId
            ? "함께 시작합시다."
            : "배우자와 연결하면 함께 시작해요."}
        </p>
      </div>

      <PartnerCard hasPartner={!!partnerEmail} partnerEmail={partnerEmail} />

      {!coupleId && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">내가 초대하기</h2>
              <p className="text-muted-foreground text-sm">
                배우자에게 보낼 초대 링크를 만들어요.
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/couple/invite">배우자 초대하기</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">초대를 받았어요</h2>
              <p className="text-muted-foreground text-sm">
                배우자가 보낸 초대 링크가 있다면, 여기서 새로 만들지 말고
                받은 그 링크를 그대로 열어주세요. 링크를 열면 바로 연결돼요.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                링크가 안 보이면 배우자에게 다시 보내달라고 요청하세요.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
