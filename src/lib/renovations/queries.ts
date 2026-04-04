import { prisma } from "@/lib/prisma";

export async function getRenovationsByUnit(unitIds: string[]) {
  return prisma.renovationApplication.findMany({
    where: { unitId: { in: unitIds } },
    include: { unit: true, approver: true, attachments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllRenovations(statusFilter?: string) {
  const where = statusFilter ? { status: statusFilter as any } : {};
  return prisma.renovationApplication.findMany({
    where,
    include: { unit: true, approver: true, attachments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRenovationById(id: string) {
  return prisma.renovationApplication.findUnique({
    where: { id },
    include: { unit: true, approver: true, attachments: true },
  });
}
