"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  userName: string;
  userRole: string;
  onMenuToggle: () => void;
}

export function TopBar({ userName, userRole, onMenuToggle }: TopBarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
