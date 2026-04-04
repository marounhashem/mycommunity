"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTicketStatus, updateTicketPriority, assignTicket, setTicketDueDate } from "@/lib/tickets/actions";

interface ManagerTicketControlsProps {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
  currentAssignee: string | null;
  currentDueDate: string;
  managers: { id: string; email: string }[];
}

export function ManagerTicketControls({
  ticketId, currentStatus, currentPriority, currentAssignee, currentDueDate, managers,
}: ManagerTicketControlsProps) {
  const router = useRouter();

  async function handleStatusChange(value: string) {
    await updateTicketStatus(ticketId, value as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED");
    router.refresh();
  }
  async function handlePriorityChange(value: string) {
    await updateTicketPriority(ticketId, value as "LOW" | "MEDIUM" | "HIGH" | "URGENT");
    router.refresh();
  }
  async function handleAssigneeChange(value: string) {
    await assignTicket(ticketId, value === "unassigned" ? null : value);
    router.refresh();
  }
  async function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    await setTicketDueDate(ticketId, e.target.value || null);
    router.refresh();
  }

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-border p-4 bg-card">
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Priority</Label>
        <Select value={currentPriority} onValueChange={handlePriorityChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Assigned To</Label>
        <Select value={currentAssignee || "unassigned"} onValueChange={handleAssigneeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {managers.map((m) => (<SelectItem key={m.id} value={m.id}>{m.email}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">SLA Due Date</Label>
        <Input type="date" value={currentDueDate} onChange={handleDueDateChange} />
      </div>
    </div>
  );
}
