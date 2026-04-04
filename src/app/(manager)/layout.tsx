import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { managerLinks } from "@/lib/nav-links";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AppShell
      links={managerLinks}
      basePath="/manager"
      userName={session.user.email ?? ""}
      userRole={session.user.role}
    >
      {children}
    </AppShell>
  );
}
