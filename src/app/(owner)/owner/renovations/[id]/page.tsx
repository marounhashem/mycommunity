import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRenovationById } from "@/lib/renovations/queries";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { StatusTracker } from "@/components/renovations/status-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function OwnerRenovationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const renovation = await getRenovationById(params.id);
  if (!renovation || !unitIds.includes(renovation.unitId)) notFound();

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-2xl">
      <Link href="/owner/renovations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to renovations
      </Link>

      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{renovation.scope}</h1>

      <div className="mb-6">
        <StatusTracker status={renovation.status} />
      </div>

      {renovation.status === "CHANGES_REQUESTED" && renovation.managerComment && (
        <Card className="mb-6 border-gold-300 bg-gold-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gold-700">Changes Requested</p>
            <p className="text-sm text-foreground mt-1">{renovation.managerComment}</p>
          </CardContent>
        </Card>
      )}

      {renovation.status === "REJECTED" && renovation.managerComment && (
        <Card className="mb-6 border-crimson-300 bg-crimson-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-crimson-700">Rejection Reason</p>
            <p className="text-sm text-foreground mt-1">{renovation.managerComment}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 text-sm mb-6">
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Unit:</span>
          <span>{renovation.unit.unitNumber}</span>
          <span className="text-muted-foreground">Description:</span>
          <span>{renovation.description}</span>
          <span className="text-muted-foreground">Start Date:</span>
          <span>{new Date(renovation.startDate).toLocaleDateString()}</span>
          {renovation.endDate && (<><span className="text-muted-foreground">End Date:</span><span>{new Date(renovation.endDate).toLocaleDateString()}</span></>)}
          {renovation.contractorName && (<><span className="text-muted-foreground">Contractor:</span><span>{renovation.contractorName}</span></>)}
          <span className="text-muted-foreground">Submitted:</span>
          <span>{new Date(renovation.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {renovation.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading text-lg font-semibold mb-2">Documents</h3>
          <div className="space-y-1">
            {renovation.attachments.map((att) => (
              <a key={att.id} href={`${publicUrl}/${att.r2Key}`} target="_blank" rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline">{att.filename}</a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
