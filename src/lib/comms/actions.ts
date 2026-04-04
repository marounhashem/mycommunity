"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAnnouncementEmail } from "@/lib/comms/email";

export async function sendAnnouncement(data: {
  title: string;
  bodyHtml: string;
  audience: "ALL" | "ZONE" | "UNIT";
  zoneFilter?: string;
  unitFilter?: string;
  attachmentR2Key?: string;
  attachmentName?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const announcement = await prisma.announcement.create({
    data: {
      authorId: session.user.id,
      title: data.title,
      bodyHtml: data.bodyHtml,
      audience: data.audience,
      zoneFilter: data.audience === "ZONE" ? data.zoneFilter : null,
      unitFilter: data.audience === "UNIT" ? data.unitFilter : null,
      attachmentR2Key: data.attachmentR2Key || null,
      attachmentName: data.attachmentName || null,
      sentAt: new Date(),
    },
  });

  let ownerUsers: { userId: string; user: { email: string } }[];

  if (data.audience === "ALL") {
    ownerUsers = await prisma.owner.findMany({
      include: { user: { select: { email: true } } },
    });
  } else if (data.audience === "ZONE" && data.zoneFilter) {
    ownerUsers = await prisma.owner.findMany({
      where: { unit: { zone: data.zoneFilter } },
      include: { user: { select: { email: true } } },
    });
  } else if (data.audience === "UNIT" && data.unitFilter) {
    ownerUsers = await prisma.owner.findMany({
      where: { unitId: data.unitFilter },
      include: { user: { select: { email: true } } },
    });
  } else {
    ownerUsers = [];
  }

  const uniqueUsers = new Map<string, string>();
  for (const o of ownerUsers) {
    uniqueUsers.set(o.userId, o.user.email);
  }

  for (const [userId, email] of Array.from(uniqueUsers.entries())) {
    await prisma.notificationLog.create({
      data: { announcementId: announcement.id, userId },
    });

    await sendAnnouncementEmail(
      email, data.title, data.bodyHtml, announcement.id
    ).catch(console.error);
  }

  revalidatePath("/manager/announcements");
  revalidatePath("/owner/announcements");

  return announcement.id;
}

export async function markAsRead(announcementId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.notificationLog.updateMany({
    where: {
      announcementId,
      userId: session.user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/owner/announcements");
}
