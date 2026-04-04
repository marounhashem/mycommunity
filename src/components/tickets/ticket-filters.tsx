"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["All", "Maintenance", "Cleaning", "Security", "Landscaping", "Other"];
const PRIORITIES = ["All", "LOW", "MEDIUM", "HIGH", "URGENT"];

interface TicketFiltersProps {
  managers: { id: string; email: string }[];
  category: string;
  priority: string;
  assignee: string;
  onCategoryChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onAssigneeChange: (v: string) => void;
}

export function TicketFilters({
  managers, category, priority, assignee,
  onCategoryChange, onPriorityChange, onAssigneeChange,
}: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c === "All" ? "All Categories" : c}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p === "All" ? "All Priorities" : p}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={assignee} onValueChange={onAssigneeChange}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {managers.map((m) => (<SelectItem key={m.id} value={m.id}>{m.email}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
