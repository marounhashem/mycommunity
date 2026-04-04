import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAnnouncementsForUser } from "@/lib/comms/queries";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const audienceLabels: Record<string, string> = {
  ALL: "All",
  ZONE: "Zone",
  UNIT: "Unit",
};

export default async function OwnerAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const notifications = await getAnnouncementsForUser(session.user.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Announcements</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Community updates and notices</p>

      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No announcements yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <Link
                key={n.id}
                href={`/owner/announcements/${n.announcement.id}`}
                className={`block rounded-lg border p-4 transition-colors hover:bg-card ${
                  isUnread ? "border-crimson-200 bg-crimson-50/30" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isUnread && (
                    <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-crimson shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"} text-foreground truncate`}>
                      {n.announcement.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {audienceLabels[n.announcement.audience] || n.announcement.audience}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.sentAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
