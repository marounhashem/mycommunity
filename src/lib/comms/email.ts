import { Resend } from "resend";

export async function sendAnnouncementEmail(
  to: string,
  title: string,
  bodyHtml: string,
  announcementId: string
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>";

  const textPreview = bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200);

  await resend.emails.send({
    from,
    to,
    subject: title,
    html: `
      <div style="max-width:500px;margin:0 auto;padding:24px;font-family:sans-serif">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#7A1022;width:40px;height:40px;line-height:40px;text-align:center">
            <span style="color:white;font-size:8px;font-weight:bold">TERRA<br>STATE</span>
          </div>
        </div>
        <h2 style="text-align:center;color:#2C2014">${title}</h2>
        <p style="color:#6B7F5B;text-align:center">${textPreview}${textPreview.length >= 200 ? "..." : ""}</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${process.env.NEXTAUTH_URL}/owner/announcements/${announcementId}"
             style="background:#7A1022;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            View Announcement
          </a>
        </div>
      </div>
    `,
  });
}
