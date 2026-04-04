"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function submitRenovation(data: {
  unitId: string;
  scope: string;
  description: string;
  contractorName?: string;
  startDate: string;
  endDate?: string;
  attachmentKeys: { key: string; filename: string }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const renovation = await prisma.renovationApplication.create({
    data: {
      unitId: data.unitId,
      scope: data.scope,
      description: data.description,
      contractorName: data.contractorName || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      attachments: {
        create: data.attachmentKeys.map((a) => ({
          r2Key: a.key,
          filename: a.filename,
        })),
      },
    },
  });

  await logAudit("RENOVATION_SUBMITTED", "RenovationApplication", renovation.id, session.user.id);

  revalidatePath("/owner/renovations");
  revalidatePath("/manager/renovations");
  return renovation.id;
}

export async function updateRenovationStatus(
  renovationId: string,
  status: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
  comment?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const data: Record<string, unknown> = {
    status,
    managerComment: comment || null,
  };

  if (status === "APPROVED") {
    data.approvedBy = session.user.id;
    data.approvedAt = new Date();
  }

  await prisma.renovationApplication.update({
    where: { id: renovationId },
    data,
  });

  const actionMap: Record<string, string> = {
    UNDER_REVIEW: "RENOVATION_UNDER_REVIEW",
    APPROVED: "RENOVATION_APPROVED",
    REJECTED: "RENOVATION_REJECTED",
    CHANGES_REQUESTED: "RENOVATION_CHANGES_REQUESTED",
  };

  await logAudit(
    actionMap[status],
    "RenovationApplication",
    renovationId,
    session.user.id,
    comment ? { comment } : undefined
  );

  revalidatePath("/owner/renovations");
  revalidatePath("/manager/renovations");
  revalidatePath(`/owner/renovations/${renovationId}`);
  revalidatePath(`/manager/renovations/${renovationId}`);
}
