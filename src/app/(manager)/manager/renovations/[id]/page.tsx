import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRenovationById } from "@/lib/renovations/queries";
import { StatusTracker } from "@/components/renovations/status-tracker";
import { ApprovalControls } from "./approval-controls";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ManagerRenovationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const renovation = await getRenovationById(params.id);
  if (!renovation) notFound();

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-2xl">
      <Link href="/manager/renovations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to approvals
      </Link>

      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{renovation.scope} — Unit {renovation.unit.unitNumber}</h1>

      <div className="mb-6"><StatusTracker status={renovation.status} /></div>

      <ApprovalControls renovationId={renovation.id} currentStatus={renovation.status} />

      {renovation.managerComment && (
        <div className="mb-6 rounded-md bg-muted p-3 text-sm">
          <span className="font-medium">Manager Comment:</span> {renovation.managerComment}
        </div>
      )}

      <div className="space-y-3 text-sm mb-6">
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Description:</span><span>{renovation.description}</span>
          <span className="text-muted-foreground">Start Date:</span><span>{new Date(renovation.startDate).toLocaleDateString()}</span>
          {renovation.endDate && (<><span className="text-muted-foreground">End Date:</span><span>{new Date(renovation.endDate).toLocaleDateString()}</span></>)}
          {renovation.contractorName && (<><span className="text-muted-foreground">Contractor:</span><span>{renovation.contractorName}</span></>)}
          <span className="text-muted-foreground">Submitted:</span><span>{new Date(renovation.createdAt).toLocaleDateString()}</span>
          {renovation.approver && (<><span className="text-muted-foreground">Reviewed by:</span><span>{renovation.approver.email}</span></>)}
        </div>
      </div>

      {renovation.attachments.length > 0 && (
        <div>
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
