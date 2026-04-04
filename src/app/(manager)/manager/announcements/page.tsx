import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllAnnouncementsWithStats } from "@/lib/comms/queries";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const audienceLabels: Record<string, string> = {
  ALL: "All Owners",
  ZONE: "By Zone",
  UNIT: "Specific Unit",
};

export default async function ManagerAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const announcements = await getAllAnnouncementsWithStats();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">All past announcements with delivery stats</p>
        </div>
        <Link
          href="/manager/comms/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Compose
        </Link>
      </div>

      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No announcements sent yet.</p>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_80px_80px] gap-4 px-4 py-3 bg-muted/30 text-xs font-semibold text-foreground">
            <span>Title</span>
            <span>Audience</span>
            <span>Sent</span>
            <span>Sent</span>
            <span>Read</span>
          </div>
          {announcements.map((a) => (
            <div key={a.id} className="grid grid-cols-[2fr_1fr_1fr_80px_80px] gap-4 px-4 py-3 border-t border-border text-sm">
              <span className="font-medium text-foreground truncate">{a.title}</span>
              <Badge variant="outline" className="w-fit text-[10px]">
                {audienceLabels[a.audience] || a.audience}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {a.sentAt ? new Date(a.sentAt).toLocaleDateString() : "Draft"}
              </span>
              <span className="text-foreground">{a.sentCount}</span>
              <span className="text-teal font-medium">{a.readCount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
