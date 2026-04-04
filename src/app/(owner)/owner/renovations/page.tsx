import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRenovationsByUnit } from "@/lib/renovations/queries";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Plus } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-gold-100 text-gold-700",
  UNDER_REVIEW: "bg-gold-100 text-gold-700",
  APPROVED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-crimson-100 text-crimson-700",
  CHANGES_REQUESTED: "bg-gold-100 text-gold-700",
};

export default async function OwnerRenovationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const renovations = await getRenovationsByUnit(unitIds);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Renovations</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and track renovation applications</p>
        </div>
        <Button asChild>
          <Link href="/owner/renovations/new"><Plus className="h-4 w-4 mr-1" /> New Application</Link>
        </Button>
      </div>

      {renovations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No renovation applications yet.</p>
      ) : (
        <div className="space-y-3">
          {renovations.map((r) => (
            <Link key={r.id} href={`/owner/renovations/${r.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{r.scope}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.description.slice(0, 100)}{r.description.length > 100 ? "..." : ""}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[r.status] || ""}>{r.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Unit {r.unit.unitNumber}</span>
                    {r.contractorName && <span>Contractor: {r.contractorName}</span>}
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
