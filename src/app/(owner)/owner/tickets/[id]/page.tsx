import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketById, getOwnerUnitIds } from "@/lib/tickets/queries";
import { Badge } from "@/components/ui/badge";
import { CommentThread } from "@/components/tickets/comment-thread";
import { StarRating } from "@/components/tickets/star-rating";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const priorityColors: Record<string, string> = {
  LOW: "bg-sage-100 text-sage-700",
  MEDIUM: "bg-gold-100 text-gold-700",
  HIGH: "bg-crimson-100 text-crimson-700",
  URGENT: "bg-crimson-200 text-crimson-900",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  CLOSED: "bg-cream-300 text-cream-800",
};

export default async function OwnerTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const ticket = await getTicketById(params.id);

  if (!ticket || !unitIds.includes(ticket.unitId)) notFound();

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-3xl">
      <Link href="/owner/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      {ticket.status === "CLOSED" && (
        <div className="mb-6">
          <StarRating ticketId={ticket.id} currentScore={ticket.satisfactionScore} />
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {ticket.category} — Unit {ticket.unit.unitNumber}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={statusColors[ticket.status] || ""}>{ticket.status.replace("_", " ")}</Badge>
          <Badge variant="outline" className={priorityColors[ticket.priority] || ""}>{ticket.priority}</Badge>
          <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {ticket.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading text-lg font-semibold mb-2">Photos</h3>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((att) => (
              <a key={att.id} href={`${publicUrl}/${att.r2Key}`} target="_blank" rel="noopener noreferrer" className="w-24 h-24 rounded-md overflow-hidden border border-border">
                <img src={`${publicUrl}/${att.r2Key}`} alt={att.filename} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <CommentThread
        ticketId={ticket.id}
        comments={ticket.comments.map((c) => ({
          id: c.id, body: c.body, isInternal: c.isInternal, createdAt: c.createdAt,
          author: { email: c.author.email, role: c.author.role },
        }))}
        showInternal={false}
        canPostInternal={false}
      />
    </div>
  );
}
