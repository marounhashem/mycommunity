import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketsByUnit, getOwnerUnitIds } from "@/lib/tickets/queries";
import { TicketCard } from "@/components/tickets/ticket-card";
import { NewTicketDialog } from "./new-ticket-dialog";
import { TicketStatusTabs } from "./ticket-status-tabs";

export default async function OwnerTicketsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const allTickets = await getTicketsByUnit(unitIds);

  const statusFilter = searchParams.status || "ALL";
  const tickets =
    statusFilter === "ALL"
      ? allTickets
      : allTickets.filter((t) => t.status === statusFilter);

  const counts = {
    ALL: allTickets.length,
    OPEN: allTickets.filter((t) => t.status === "OPEN").length,
    IN_PROGRESS: allTickets.filter((t) => t.status === "IN_PROGRESS").length,
    RESOLVED: allTickets.filter((t) => t.status === "RESOLVED").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and track your requests</p>
        </div>
        <NewTicketDialog unitIds={unitIds} />
      </div>

      <TicketStatusTabs currentStatus={statusFilter} counts={counts} />

      <div className="mt-4 space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No tickets found.</p>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              id={ticket.id}
              category={ticket.category}
              description={ticket.description}
              priority={ticket.priority}
              status={ticket.status}
              unitNumber={ticket.unit.unitNumber}
              assigneeEmail={ticket.assignee?.email}
              dueDate={ticket.dueDate}
              createdAt={ticket.createdAt}
              commentCount={ticket._count.comments}
              href={`/owner/tickets/${ticket.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
