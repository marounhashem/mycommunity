import {
  LayoutDashboard,
  Home,
  FileText,
  Ticket,
  Megaphone,
  HardHat,
  AlertTriangle,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ownerLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Unit", href: "/unit", icon: Home },
  { label: "My Invoices", href: "/invoices", icon: FileText },
  { label: "My Tickets", href: "/tickets", icon: Ticket },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
];

export const managerLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "All Units", href: "/units", icon: Home },
  { label: "All Invoices", href: "/invoices", icon: FileText },
  { label: "All Tickets", href: "/tickets", icon: Ticket },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Renovation Apps", href: "/renovations", icon: HardHat },
  { label: "Violations", href: "/violations", icon: AlertTriangle },
];

export const adminLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "All Units", href: "/units", icon: Home },
  { label: "All Invoices", href: "/invoices", icon: FileText },
  { label: "All Tickets", href: "/tickets", icon: Ticket },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Renovation Apps", href: "/renovations", icon: HardHat },
  { label: "Violations", href: "/violations", icon: AlertTriangle },
  { label: "User Management", href: "/users", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function getRoleDashboardPath(role: string): string {
  switch (role) {
    case "OWNER":
      return "/owner/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}

export function getRoleBasePath(role: string): string {
  switch (role) {
    case "OWNER":
      return "/owner";
    case "MANAGER":
      return "/manager";
    case "ADMIN":
      return "/admin";
    default:
      return "/login";
  }
}
