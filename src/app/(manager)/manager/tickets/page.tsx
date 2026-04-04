import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTickets, getManagerUsers } from "@/lib/tickets/queries";
import dynamic from "next/dynamic";

const KanbanBoard = dynamic(
  () => import("@/components/tickets/kanban-board").then((m) => m.KanbanBoard),
  { ssr: false }
);

export default async function ManagerTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [tickets, managers] = await Promise.all([
    getAllTickets(),
    getManagerUsers(),
  ]);

  const kanbanTickets = tickets.map((t) => ({
    id: t.id,
    category: t.category,
    description: t.description,
    priority: t.priority,
    status: t.status,
    unitNumber: t.unit.unitNumber,
    assigneeEmail: t.assignee?.email || null,
    assigneeId: t.assignedTo,
    dueDate: t.dueDate,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">All Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and triage community requests</p>
      </div>
      <KanbanBoard tickets={kanbanTickets} managers={managers} />
    </div>
  );
}
