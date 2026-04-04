import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      userId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}
