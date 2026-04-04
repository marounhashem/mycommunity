import { prisma } from "@/lib/prisma";

export async function getViolationsByUnit(unitIds: string[]) {
  return prisma.violation.findMany({
    where: { unitId: { in: unitIds } },
    include: { unit: true, issuedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllViolations() {
  return prisma.violation.findMany({
    include: { unit: true, issuedBy: true },
    orderBy: { createdAt: "desc" },
  });
}
