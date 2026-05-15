import { BetaDisclaimer } from "@/components/safety/BetaDisclaimer";
import { AmberDisclaimer } from "@/components/safety/AmberDisclaimer";
import { SourceDisclaimer } from "@/components/safety/SourceDisclaimer";
import { EmergencyEscalation } from "@/components/safety/EmergencyEscalation";
import {
  MentalHealthEscalation,
  MentalHealthFootnote,
} from "@/components/safety/MentalHealthEscalation";

export default function SafetyDevPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Safety components dev preview</h1>
      <p className="text-sm text-muted-foreground">
        M2 Task 2 — 5 safety components. K1 톤 가드 검수용. 빌드 후 삭제 가능.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">BetaDisclaimer</h2>
        <BetaDisclaimer />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">AmberDisclaimer (default)</h2>
        <AmberDisclaimer />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">AmberDisclaimer (custom)</h2>
        <AmberDisclaimer>
          기관별 차이가 있을 수 있어요. 본인 병원·주민센터에서 확인하세요.
        </AmberDisclaimer>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">SourceDisclaimer</h2>
        <SourceDisclaimer
          sources={[
            {
              org: "KSRM 환자안내문 2024",
              publishDate: "2024-05",
              url: "https://ksrm.or.kr/...",
            },
            {
              org: "보건복지부 난임부부 시술비 지원사업",
              publishDate: "2026-01",
            },
          ]}
          note="기관·지역별 차이가 있을 수 있어요."
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">EmergencyEscalation (신체)</h2>
        <EmergencyEscalation symptomNote="배가 많이 부풀고 토함, 소변 안 나옴 등의 OHSS 의심 증상을 입력하셨어요." />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">MentalHealthEscalation (P2 ⚠️)</h2>
        <MentalHealthEscalation />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">MentalHealthFootnote</h2>
        <MentalHealthFootnote />
      </section>
    </main>
  );
}
