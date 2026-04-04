"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";
import type { NavLink } from "@/lib/nav-links";

interface AppShellProps {
  children: React.ReactNode;
  links: NavLink[];
  basePath: string;
  userName: string;
  userRole: string;
  unreadCount?: number;
}

function AppShellInner({ children, links, basePath, userName, userRole, unreadCount }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        userName={userName}
        userRole={userRole}
        unreadCount={unreadCount}
        onMenuToggle={() => setSidebarOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          links={links}
          basePath={basePath}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />
        <main className="flex-1 overflow-auto bg-cream p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <SessionProvider>
      <AppShellInner {...props} />
    </SessionProvider>
  );
}
