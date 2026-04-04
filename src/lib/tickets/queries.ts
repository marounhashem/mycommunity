import { prisma } from "@/lib/prisma";

export async function getTicketsByUnit(unitIds: string[]) {
  return prisma.ticket.findMany({
    where: { unitId: { in: unitIds } },
    include: {
      unit: true,
      assignee: true,
      attachments: true,
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllTickets(filters?: {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.category) where.category = filters.category;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.assignedTo) where.assignedTo = filters.assignedTo;

  return prisma.ticket.findMany({
    where,
    include: {
      unit: true,
      assignee: true,
      attachments: true,
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTicketById(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      unit: true,
      assignee: true,
      attachments: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getOwnerUnitIds(userId: string): Promise<string[]> {
  const owners = await prisma.owner.findMany({
    where: { userId },
    select: { unitId: true },
  });
  return owners.map((o) => o.unitId);
}

export async function getManagerUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] } },
    select: { id: true, email: true },
  });
}
