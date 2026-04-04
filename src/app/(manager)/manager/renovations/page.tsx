import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllRenovations } from "@/lib/renovations/queries";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const statusColors: Record<string, string> = {
  PENDING: "bg-gold-100 text-gold-700",
  UNDER_REVIEW: "bg-gold-100 text-gold-700",
  APPROVED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-crimson-100 text-crimson-700",
  CHANGES_REQUESTED: "bg-gold-100 text-gold-700",
};

export default async function ManagerRenovationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const renovations = await getAllRenovations(searchParams.status);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Renovation Approvals</h1>
      <p className="text-sm text-muted-foreground mb-6">Review and approve renovation applications</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((s) => (
          <Link key={s} href={s === "ALL" ? "/manager/renovations" : `/manager/renovations?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              (searchParams.status || "ALL") === s ? "bg-crimson text-white border-crimson" : "bg-card border-border text-foreground"
            }`}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {renovations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No applications found.</p>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 px-4 py-3 bg-muted/30 text-xs font-semibold">
            <span>Unit</span><span>Scope</span><span>Submitted</span><span>Status</span>
          </div>
          {renovations.map((r) => (
            <Link key={r.id} href={`/manager/renovations/${r.id}`} className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 px-4 py-3 border-t border-border text-sm hover:bg-muted/10">
              <span className="font-medium">{r.unit.unitNumber}</span>
              <span className="truncate text-muted-foreground">{r.scope} — {r.description.slice(0, 50)}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
              <Badge variant="outline" className={`w-fit text-[10px] ${statusColors[r.status]}`}>{r.status.replace("_", " ")}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
