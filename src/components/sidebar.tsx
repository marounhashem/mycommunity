"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { NavLink } from "@/lib/nav-links";
import { cn } from "@/lib/utils";

interface SidebarProps {
  links: NavLink[];
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SidebarContent({ links, basePath }: Pick<SidebarProps, "links" | "basePath">) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-teal-700 text-cream">
      <nav className="flex-1 space-y-0.5 py-4">
        {links.map((link) => {
          const fullHref = `${basePath}${link.href}`;
          const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/");
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={fullHref}
              className={cn(
                "flex items-center gap-3 border-l-[3px] px-5 py-2.5 text-sm transition-colors",
                isActive
                  ? "border-gold bg-white/10 font-medium text-cream"
                  : "border-transparent text-cream/70 hover:bg-white/5 hover:text-cream"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Separator className="bg-white/10" />
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-3 px-5 py-3 text-sm text-cream/50 hover:text-cream/80 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

export function Sidebar({ links, basePath, open, onOpenChange }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 md:block">
        <SidebarContent links={links} basePath={basePath} />
      </aside>

      {/* Mobile sidebar (sheet overlay) */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[220px] p-0 border-none">
          <SidebarContent links={links} basePath={basePath} />
        </SheetContent>
      </Sheet>
    </>
  );
}
