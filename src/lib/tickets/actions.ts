"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTicketStatusEmail } from "@/lib/tickets/email";

export async function createTicket(data: {
  unitId: string;
  category: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  attachmentKeys: { key: string; filename: string }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticket = await prisma.ticket.create({
    data: {
      unitId: data.unitId,
      category: data.category,
      description: data.description,
      priority: data.priority,
      attachments: {
        create: data.attachmentKeys.map((a) => ({
          r2Key: a.key,
          filename: a.filename,
        })),
      },
    },
  });

  revalidatePath("/owner/tickets");
  revalidatePath("/manager/tickets");
  return ticket;
}

export async function updateTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status },
  });

  await sendTicketStatusEmail(ticketId, status).catch(console.error);

  revalidatePath("/owner/tickets");
  revalidatePath("/manager/tickets");
  revalidatePath(`/owner/tickets/${ticketId}`);
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function assignTicket(ticketId: string, userId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedTo: userId },
  });

  revalidatePath("/manager/tickets");
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function updateTicketPriority(
  ticketId: string,
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority },
  });

  revalidatePath("/manager/tickets");
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function setTicketDueDate(ticketId: string, dueDate: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { dueDate: dueDate ? new Date(dueDate) : null },
  });

  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function addComment(
  ticketId: string,
  body: string,
  isInternal: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (session.user.role === "OWNER" && isInternal) {
    throw new Error("Owners cannot post internal notes");
  }

  await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: session.user.id,
      body,
      isInternal,
    },
  });

  revalidatePath(`/owner/tickets/${ticketId}`);
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function rateTicket(ticketId: string, score: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (score < 1 || score > 5) throw new Error("Score must be 1-5");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket || ticket.status !== "CLOSED") {
    throw new Error("Can only rate closed tickets");
  }

  if (ticket.satisfactionScore !== null) {
    throw new Error("Already rated");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { satisfactionScore: score },
  });

  revalidatePath(`/owner/tickets/${ticketId}`);
}
