import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAnnouncementById } from "@/lib/comms/queries";
import { markAsRead } from "@/lib/comms/actions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Paperclip } from "lucide-react";

const audienceLabels: Record<string, string> = {
  ALL: "All Owners",
  ZONE: "By Zone",
  UNIT: "Specific Unit",
};

export default async function OwnerAnnouncementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const announcement = await getAnnouncementById(params.id);
  if (!announcement) notFound();

  await markAsRead(announcement.id);

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-2xl">
      <Link
        href="/owner/announcements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to announcements
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">{announcement.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">
            {audienceLabels[announcement.audience] || announcement.audience}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {announcement.sentAt ? new Date(announcement.sentAt).toLocaleDateString() : ""}
          </span>
          <span className="text-xs text-muted-foreground">by {announcement.author.email}</span>
        </div>
      </div>

      <div className="prose prose-sm max-w-none mb-6" dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }} />

      {announcement.attachmentR2Key && (
        <div className="flex items-center gap-2 rounded-md border border-border px-4 py-3">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <a
            href={`${publicUrl}/${announcement.attachmentR2Key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {announcement.attachmentName || "Download attachment"}
          </a>
        </div>
      )}
    </div>
  );
}
