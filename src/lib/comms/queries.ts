import { prisma } from "@/lib/prisma";

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notificationLog.count({
    where: { userId, readAt: null },
  });
}

export async function getAnnouncementsForUser(userId: string) {
  return prisma.notificationLog.findMany({
    where: { userId },
    include: {
      announcement: {
        include: { author: true },
      },
    },
    orderBy: { sentAt: "desc" },
  });
}

export async function getAnnouncementById(id: string) {
  return prisma.announcement.findUnique({
    where: { id },
    include: { author: true },
  });
}

export async function getAllAnnouncementsWithStats() {
  const announcements = await prisma.announcement.findMany({
    where: { sentAt: { not: null } },
    include: {
      author: true,
      _count: { select: { notifications: true } },
      notifications: {
        select: { readAt: true },
      },
    },
    orderBy: { sentAt: "desc" },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    audience: a.audience,
    sentAt: a.sentAt,
    authorEmail: a.author.email,
    sentCount: a._count.notifications,
    readCount: a.notifications.filter((n) => n.readAt !== null).length,
  }));
}

export async function getDistinctZones(): Promise<string[]> {
  const zones = await prisma.unit.findMany({
    select: { zone: true },
    distinct: ["zone"],
    orderBy: { zone: "asc" },
  });
  return zones.map((z) => z.zone);
}

export async function getAllUnits() {
  return prisma.unit.findMany({
    select: { id: true, unitNumber: true, zone: true },
    orderBy: { unitNumber: "asc" },
  });
}
