import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllViolations } from "@/lib/violations/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ResolveButton } from "./resolve-button";

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  PAID: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
};

export default async function ManagerViolationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const violations = await getAllViolations();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Violations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage community rule violations</p>
        </div>
        <Button asChild>
          <Link href="/manager/violations/new"><Plus className="h-4 w-4 mr-1" /> Issue Violation</Link>
        </Button>
      </div>

      {violations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No violations issued.</p>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_80px_1fr_80px] gap-4 px-4 py-3 bg-muted/30 text-xs font-semibold">
            <span>Unit</span><span>Rule</span><span>Fine</span><span>Date</span><span>Status</span>
          </div>
          {violations.map((v) => (
            <div key={v.id} className="grid grid-cols-[1fr_2fr_80px_1fr_80px] gap-4 px-4 py-3 border-t border-border text-sm items-center">
              <span className="font-medium">{v.unit.unitNumber}</span>
              <span className="truncate text-muted-foreground">{v.ruleBreached}</span>
              <span>{v.fineAmountAed ? `${v.fineAmountAed} AED` : "—"}</span>
              <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={`text-[10px] ${statusColors[v.status]}`}>{v.status}</Badge>
                {v.status === "OPEN" && <ResolveButton violationId={v.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
