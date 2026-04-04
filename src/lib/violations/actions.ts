"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function createViolation(data: {
  unitId: string;
  ruleBreached: string;
  description?: string;
  evidenceR2Key?: string;
  evidenceName?: string;
  fineAmountAed?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const violation = await prisma.violation.create({
    data: {
      unitId: data.unitId,
      issuedById: session.user.id,
      ruleBreached: data.ruleBreached,
      description: data.description || null,
      evidenceR2Key: data.evidenceR2Key || null,
      evidenceName: data.evidenceName || null,
      fineAmountAed: data.fineAmountAed ?? null,
    },
  });

  await logAudit("VIOLATION_CREATED", "Violation", violation.id, session.user.id, {
    unitId: data.unitId,
    rule: data.ruleBreached,
    fineAed: data.fineAmountAed,
  });

  revalidatePath("/owner/violations");
  revalidatePath("/manager/violations");
  return violation.id;
}

export async function resolveViolation(violationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.violation.update({
    where: { id: violationId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await logAudit("VIOLATION_RESOLVED", "Violation", violationId, session.user.id);

  revalidatePath("/owner/violations");
  revalidatePath("/manager/violations");
}
