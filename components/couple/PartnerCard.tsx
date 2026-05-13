import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface PartnerCardProps {
  hasPartner: boolean;
  partnerEmail?: string | null;
}

export function PartnerCard({ hasPartner, partnerEmail }: PartnerCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium">페어 상태</h2>
      </CardHeader>
      <CardContent>
        {hasPartner ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">함께 가는 배우자</p>
            <p className="font-medium" data-testid="partner-email">
              {partnerEmail}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            아직 배우자가 연결되지 않았습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
