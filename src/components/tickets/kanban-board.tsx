"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateTicketStatus } from "@/lib/tickets/actions";
import { TicketFilters } from "./ticket-filters";

interface KanbanTicket {
  id: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  unitNumber: string;
  assigneeEmail: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
}

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  managers: { id: string; email: string }[];
}

const COLUMNS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const columnLabels: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", RESOLVED: "Resolved", CLOSED: "Closed",
};

const columnColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  CLOSED: "bg-cream-300 text-cream-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-sage-100 text-sage-700",
  MEDIUM: "bg-gold-100 text-gold-700",
  HIGH: "bg-crimson-100 text-crimson-700",
  URGENT: "bg-crimson-200 text-crimson-900",
};

export function KanbanBoard({ tickets: initialTickets, managers }: KanbanBoardProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");

  const filtered = tickets.filter((t) => {
    if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
    if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
    if (assigneeFilter === "unassigned" && t.assigneeId !== null) return false;
    if (assigneeFilter !== "All" && assigneeFilter !== "unassigned" && t.assigneeId !== assigneeFilter) return false;
    return true;
  });

  function getColumnTickets(status: string) {
    return filtered.filter((t) => t.status === status);
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const ticketId = result.draggableId;
    const newStatus = result.destination.droppableId as typeof COLUMNS[number];

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)));

    try {
      await updateTicketStatus(ticketId, newStatus);
    } catch {
      setTickets(initialTickets);
    }
  }

  const initials = (email: string) =>
    email.split("@")[0].split(".").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div>
      <TicketFilters
        managers={managers} category={categoryFilter} priority={priorityFilter} assignee={assigneeFilter}
        onCategoryChange={setCategoryFilter} onPriorityChange={setPriorityFilter} onAssigneeChange={setAssigneeFilter}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTickets = getColumnTickets(col);
            return (
              <div key={col}>
                <div className="flex items-center justify-between px-3 py-2 bg-cream-100 rounded-t-lg">
                  <span className="text-sm font-semibold text-foreground">{columnLabels[col]}</span>
                  <Badge className={columnColors[col]} variant="secondary">{colTickets.length}</Badge>
                </div>
                <Droppable droppableId={col}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px] bg-white border border-border border-t-0 rounded-b-lg p-2 space-y-2">
                      {colTickets.map((ticket, index) => {
                        const isUrgent = ticket.priority === "HIGH" || ticket.priority === "URGENT";
                        return (
                          <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                            {(provided) => (
                              <a ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                href={`/manager/tickets/${ticket.id}`}
                                className={`block rounded-md border border-border p-3 bg-card hover:shadow-sm transition-shadow ${isUrgent ? "border-l-4 border-l-crimson" : ""}`}
                              >
                                <p className="text-sm font-medium text-foreground truncate">{ticket.category} — Unit {ticket.unitNumber}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                                <div className="mt-2 flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-[10px] ${priorityColors[ticket.priority]}`}>{ticket.priority}</Badge>
                                  {ticket.assigneeEmail ? (
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="bg-gold text-white text-[8px]">{initials(ticket.assigneeEmail)}</AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">Unassigned</span>
                                  )}
                                  {ticket.dueDate && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">{new Date(ticket.dueDate).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </a>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
