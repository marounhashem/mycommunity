"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TicketStatusTabsProps {
  currentStatus: string;
  counts: Record<string, number>;
}

export function TicketStatusTabs({ currentStatus, counts }: TicketStatusTabsProps) {
  const router = useRouter();

  function handleChange(value: string) {
    const params = value === "ALL" ? "" : `?status=${value}`;
    router.push(`/owner/tickets${params}`);
  }

  return (
    <Tabs value={currentStatus} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="ALL">All ({counts.ALL})</TabsTrigger>
        <TabsTrigger value="OPEN">Open ({counts.OPEN})</TabsTrigger>
        <TabsTrigger value="IN_PROGRESS">In Progress ({counts.IN_PROGRESS})</TabsTrigger>
        <TabsTrigger value="RESOLVED">Resolved ({counts.RESOLVED})</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
