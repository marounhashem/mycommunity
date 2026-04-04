"use client";

import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TopBarProps {
  userName: string;
  userRole: string;
  unreadCount?: number;
  onMenuToggle: () => void;
}

export function TopBar({ userName, userRole, unreadCount = 0, onMenuToggle }: TopBarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bellHref = userRole === "OWNER"
    ? "/owner/announcements"
    : "/manager/announcements";

  return (
    <header className="flex h-14 items-center justify-between bg-crimson px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 md:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center bg-white">
            <span className="text-[6px] font-bold leading-tight text-crimson text-center">
              TERRA
              <br />
              STATE
            </span>
          </div>
          <span className="font-heading text-lg font-semibold text-white tracking-wide">
            MyCommunity
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Link href={bellHref} className="relative text-white hover:text-white/80">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-crimson px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <Badge
          variant="secondary"
          className="bg-white/20 text-white border-none text-[10px] font-medium hover:bg-white/20"
        >
          {userRole}
        </Badge>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-xs font-semibold text-white">
          {initials || "?"}
        </div>
      </div>
    </header>
  );
}
