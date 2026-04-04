import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export async function sendTicketStatusEmail(
  ticketId: string,
  newStatus: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      unit: {
        include: {
          owners: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!ticket) return;

  const ownerEmails = ticket.unit.owners
    .map((o) => o.user.email)
    .filter(Boolean);

  if (ownerEmails.length === 0) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>";
  const statusLabel = newStatus.replace("_", " ");
  const ticketLabel = `${ticket.category} - Unit ${ticket.unit.unitNumber}`;

  for (const email of ownerEmails) {
    await resend.emails.send({
      from,
      to: email,
      subject: `Request Updated: ${ticketLabel}`,
      html: `
        <div style="max-width:400px;margin:0 auto;padding:24px;font-family:sans-serif">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;background:#7A1022;width:40px;height:40px;line-height:40px;text-align:center">
              <span style="color:white;font-size:8px;font-weight:bold">TERRA<br>STATE</span>
            </div>
          </div>
          <h2 style="text-align:center;color:#2C2014">Request Updated</h2>
          <p style="color:#6B7F5B;text-align:center">
            Your request <strong>${ticketLabel}</strong> has been updated to
            <strong style="color:#2C2014">${statusLabel}</strong>.
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${process.env.NEXTAUTH_URL}/owner/tickets/${ticketId}"
               style="background:#7A1022;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
              View Request
            </a>
          </div>
        </div>
      `,
    });
  }
}
