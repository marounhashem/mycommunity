import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ownerLinks } from "@/lib/nav-links";
import { getUnreadCount } from "@/lib/comms/queries";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unreadCount = await getUnreadCount(session.user.id);

  return (
    <AppShell
      links={ownerLinks}
      basePath="/owner"
      userName={session.user.email ?? ""}
      userRole={session.user.role}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
