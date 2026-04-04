import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getViolationsByUnit } from "@/lib/violations/queries";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  PAID: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
};

export default async function OwnerViolationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const violations = await getViolationsByUnit(unitIds);
  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Violations</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Community rule violations for your unit</p>

      {violations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No violations on record.</p>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{v.ruleBreached}</p>
                    {v.description && <p className="text-xs text-muted-foreground mt-1">{v.description}</p>}
                  </div>
                  <Badge variant="outline" className={statusColors[v.status]}>{v.status}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Unit {v.unit.unitNumber}</span>
                  {v.fineAmountAed && <span className="font-medium text-crimson">{String(v.fineAmountAed)} AED</span>}
                  <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
                {v.evidenceR2Key && (
                  <a href={`${publicUrl}/${v.evidenceR2Key}`} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-primary hover:underline">View evidence</a>
                )}
                {v.status === "OPEN" && v.fineAmountAed && (
                  <div className="mt-3">
                    <Button size="sm" asChild>
                      <Link href="/owner/payment-pending">Pay Fine</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
