# Auth System & App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build role-based authentication (credentials + magic link) and a branded app shell with crimson top bar, teal sidebar, and cream content area.

**Architecture:** Middleware-first route protection with three Next.js route groups `(owner)`, `(manager)`, `(admin)`. A shared `AppShell` component receives role-specific nav links as props. NextAuth JWT strategy with CredentialsProvider + EmailProvider (Resend).

**Tech Stack:** Next.js 14, NextAuth v4, Prisma 7, Resend, shadcn/ui, Tailwind CSS, bcryptjs

**Spec:** `docs/superpowers/specs/2026-04-04-auth-system-design.md`

---

### Task 1: Prisma Schema — Add VerificationToken and make hashedPassword nullable

**Files:**
- Modify: `prisma/schema.prisma:50-54` (User model, hashedPassword field)
- Modify: `prisma/schema.prisma` (add VerificationToken model at end)
- Modify: `src/lib/auth.ts:23` (handle nullable hashedPassword)

- [ ] **Step 1: Make hashedPassword nullable in User model**

In `prisma/schema.prisma`, change line 54 from:

```prisma
  hashedPassword  String   @map("hashed_password")
```

to:

```prisma
  hashedPassword  String?  @map("hashed_password")
```

- [ ] **Step 2: Add VerificationToken model**

Add at the end of `prisma/schema.prisma`:

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

- [ ] **Step 3: Fix credentials provider for nullable hashedPassword**

In `src/lib/auth.ts`, change the authorize function's password check (line 23) from:

```typescript
        const isValid = await compare(credentials.password, user.hashedPassword);
```

to:

```typescript
        if (!user.hashedPassword) return null;
        const isValid = await compare(credentials.password, user.hashedPassword);
```

- [ ] **Step 4: Run migration**

Run:
```bash
npx prisma migrate dev --name add-magic-link-support
```

Expected: Migration applies successfully, creates `verification_tokens` table, alters `hashed_password` column to nullable.

- [ ] **Step 5: Regenerate Prisma client**

Run:
```bash
npx prisma generate
```

Expected: `Generated Prisma Client` message.

- [ ] **Step 6: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/auth.ts
git commit -m "feat: add VerificationToken model and make hashedPassword nullable for magic link support"
```

---

### Task 2: Install dependencies — Resend and shadcn components

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install resend**

Run:
```bash
npm install resend
```

- [ ] **Step 2: Install shadcn/ui components**

Run each individually (shadcn CLI installs one at a time):
```bash
npx shadcn@latest add input label tabs card avatar badge sheet separator --yes
```

- [ ] **Step 3: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/ui/
git commit -m "feat: install resend and shadcn/ui components (input, label, tabs, card, avatar, badge, sheet, separator)"
```

---

### Task 3: Typography — Replace Inter with Cormorant Garamond + DM Sans

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css:78-85`
- Modify: `tailwind.config.ts` (add fontFamily extend)

- [ ] **Step 1: Update root layout with new fonts**

Replace the entire contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-heading",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MyCommunity",
  description: "Community management platform by Terra State",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${dmSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add font-heading utility to globals.css**

In `src/app/globals.css`, replace the second `@layer base` block (lines 78-85) with:

```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  .font-heading {
    font-family: var(--font-heading);
  }
}
```

- [ ] **Step 3: Add fontFamily to tailwind config**

In `tailwind.config.ts`, add inside `theme.extend` (after the `colors` block, before `borderRadius`):

```typescript
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"],
      },
```

- [ ] **Step 4: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css tailwind.config.ts
git commit -m "feat: replace Inter with Cormorant Garamond (headings) and DM Sans (body)"
```

---

### Task 4: Nav links config — Define sidebar links per role

**Files:**
- Create: `src/lib/nav-links.ts`

- [ ] **Step 1: Create nav links file**

Create `src/lib/nav-links.ts`:

```typescript
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
      return "/(owner)/dashboard";
    case "MANAGER":
      return "/(manager)/dashboard";
    case "ADMIN":
      return "/(admin)/dashboard";
    default:
      return "/login";
  }
}

export function getRoleBasePath(role: string): string {
  switch (role) {
    case "OWNER":
      return "/(owner)";
    case "MANAGER":
      return "/(manager)";
    case "ADMIN":
      return "/(admin)";
    default:
      return "/login";
  }
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/nav-links.ts
git commit -m "feat: add nav link definitions per role"
```

---

### Task 5: TopBar component

**Files:**
- Create: `src/components/top-bar.tsx`

- [ ] **Step 1: Create the TopBar component**

Create `src/components/top-bar.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/top-bar.tsx
git commit -m "feat: add TopBar component with Terra State branding"
```

---

### Task 6: Sidebar component

**Files:**
- Create: `src/components/sidebar.tsx`

- [ ] **Step 1: Create the Sidebar component**

Create `src/components/sidebar.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: add Sidebar component with role-specific nav links"
```

---

### Task 7: AppShell component

**Files:**
- Create: `src/components/app-shell.tsx`

- [ ] **Step 1: Create the AppShell component**

Create `src/components/app-shell.tsx`:

```tsx
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
}

function AppShellInner({ children, links, basePath, userName, userRole }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        userName={userName}
        userRole={userRole}
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
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "feat: add AppShell layout component combining TopBar and Sidebar"
```

---

### Task 8: Route group layouts and dashboard placeholders

**Files:**
- Create: `src/app/(owner)/layout.tsx`
- Create: `src/app/(owner)/dashboard/page.tsx`
- Create: `src/app/(manager)/layout.tsx`
- Create: `src/app/(manager)/dashboard/page.tsx`
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/dashboard/page.tsx`
- Delete: `src/app/page.tsx` (replace with route groups)

- [ ] **Step 1: Create owner layout**

Create `src/app/(owner)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ownerLinks } from "@/lib/nav-links";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AppShell
      links={ownerLinks}
      basePath="/(owner)"
      userName={session.user.email ?? ""}
      userRole={session.user.role}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 2: Create owner dashboard**

Create `src/app/(owner)/dashboard/page.tsx`:

```tsx
export default function OwnerDashboard() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome to your owner portal</p>
    </div>
  );
}
```

- [ ] **Step 3: Create manager layout**

Create `src/app/(manager)/layout.tsx`:

```tsx
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
      basePath="/(manager)"
      userName={session.user.email ?? ""}
      userRole={session.user.role}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 4: Create manager dashboard**

Create `src/app/(manager)/dashboard/page.tsx`:

```tsx
export default function ManagerDashboard() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Community management overview</p>
    </div>
  );
}
```

- [ ] **Step 5: Create admin layout**

Create `src/app/(admin)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { adminLinks } from "@/lib/nav-links";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AppShell
      links={adminLinks}
      basePath="/(admin)"
      userName={session.user.email ?? ""}
      userRole={session.user.role}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 6: Create admin dashboard**

Create `src/app/(admin)/dashboard/page.tsx`:

```tsx
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">System administration</p>
    </div>
  );
}
```

- [ ] **Step 7: Remove old default page**

Delete `src/app/page.tsx` (the default Next.js page — replaced by route groups).

- [ ] **Step 8: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds. Routes listed include `/(owner)/dashboard`, `/(manager)/dashboard`, `/(admin)/dashboard`.

- [ ] **Step 9: Commit**

```bash
git add src/app/(owner)/ src/app/(manager)/ src/app/(admin)/
git rm src/app/page.tsx
git commit -m "feat: add route group layouts and dashboard placeholders for owner, manager, admin"
```

---

### Task 9: Middleware — Role-based route protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create the middleware**

Create `src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  const publicPaths = ["/login", "/set-password", "/api/auth"];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const token = await getToken({ req: request });

  // Unauthenticated + protected route → login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated + needs password + not on set-password → set-password
  if (token?.needsPassword && pathname !== "/set-password") {
    return NextResponse.redirect(new URL("/set-password", request.url));
  }

  // Authenticated + on login → redirect to role dashboard
  if (token && pathname === "/login") {
    const dashboardPath = getDashboardPath(token.role as string);
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // Role-based route group checks
  if (token && !isPublic) {
    const role = token.role as string;

    if (pathname.startsWith("/(owner)") && role !== "OWNER") {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url)
      );
    }

    if (
      pathname.startsWith("/(manager)") &&
      role !== "MANAGER" &&
      role !== "ADMIN"
    ) {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url)
      );
    }

    if (pathname.startsWith("/(admin)") && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url)
      );
    }
  }

  return NextResponse.next();
}

function getDashboardPath(role: string): string {
  switch (role) {
    case "OWNER":
      return "/(owner)/dashboard";
    case "MANAGER":
      return "/(manager)/dashboard";
    case "ADMIN":
      return "/(admin)/dashboard";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add middleware for role-based route protection"
```

---

### Task 10: NextAuth config — Add EmailProvider with Resend

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/types/next-auth.d.ts`

- [ ] **Step 1: Update NextAuth config with EmailProvider and needsPassword flag**

Replace the entire contents of `src/lib/auth.ts` with:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { compare } from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) return null;

        const isValid = await compare(
          credentials.password,
          user.hashedPassword
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY!,
        },
      },
      from: process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>",
      async sendVerificationRequest({ identifier: email, url }) {
        await resend.emails.send({
          from:
            process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>",
          to: email,
          subject: "Sign in to MyCommunity",
          html: `
            <div style="max-width:400px;margin:0 auto;padding:24px;font-family:sans-serif">
              <div style="text-align:center;margin-bottom:24px">
                <div style="display:inline-block;background:#7A1022;width:40px;height:40px;line-height:40px;text-align:center">
                  <span style="color:white;font-size:8px;font-weight:bold">TERRA<br>STATE</span>
                </div>
              </div>
              <h2 style="text-align:center;color:#2C2014">Sign in to MyCommunity</h2>
              <p style="color:#6B7F5B;text-align:center">Click the button below to sign in to your account.</p>
              <div style="text-align:center;margin:24px 0">
                <a href="${url}" style="background:#7A1022;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
                  Sign In
                </a>
              </div>
              <p style="color:#6B7F5B;text-align:center;font-size:12px">If you didn't request this, you can ignore this email.</p>
            </div>
          `,
        });
      },
    }),
  ],
  adapter: {
    createUser: async (data) => {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          role: "OWNER",
        },
      });
      return { id: user.id, email: user.email, role: user.role, emailVerified: null };
    },
    getUser: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return { id: user.id, email: user.email, role: user.role, emailVerified: null };
    },
    getUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return { id: user.id, email: user.email, role: user.role, emailVerified: null };
    },
    getUserByAccount: async () => null,
    updateUser: async ({ id, ...data }) => {
      const user = await prisma.user.update({ where: { id }, data: {} });
      return { id: user.id, email: user.email, role: user.role, emailVerified: null };
    },
    linkAccount: async () => undefined,
    createSession: async () => { throw new Error("JWT strategy — no DB sessions"); },
    getSessionAndUser: async () => null,
    updateSession: async () => null,
    deleteSession: async () => {},
    createVerificationToken: async (data) => {
      const token = await prisma.verificationToken.create({ data });
      return token;
    },
    useVerificationToken: async ({ identifier, token }) => {
      try {
        const result = await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
        return result;
      } catch {
        return null;
      }
    },
  },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      // Check if user exists in DB (for email provider flow)
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          user.id = dbUser.id;
          user.role = dbUser.role;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
      }
      // Check needsPassword on every token refresh
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        token.needsPassword = dbUser ? !dbUser.hashedPassword : false;
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
  },
};
```

- [ ] **Step 2: Update type augmentations for needsPassword**

Replace the entire contents of `src/types/next-auth.d.ts` with:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    needsPassword?: boolean;
  }
}
```

- [ ] **Step 3: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts
git commit -m "feat: add EmailProvider with Resend for magic link login"
```

---

### Task 11: Login page — Tabbed credentials + magic link

**Files:**
- Create: `src/app/(public)/login/page.tsx`

- [ ] **Step 1: Create the login page**

Create `src/app/(public)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyParam = searchParams.get("verify");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(verifyParam === "true");

  // Credentials form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Magic link form state
  const [magicEmail, setMagicEmail] = useState("");

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    // Fetch session to get role for redirect
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;

    if (role === "OWNER") router.push("/(owner)/dashboard");
    else if (role === "MANAGER") router.push("/(manager)/dashboard");
    else if (role === "ADMIN") router.push("/(admin)/dashboard");
    else router.push("/login");
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await signIn("email", {
      email: magicEmail,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);
    setMagicSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <Card className="w-full max-w-[400px] border-cream-300 shadow-md">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Logo */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center bg-crimson">
                <span className="text-[7px] font-bold leading-tight text-white text-center">
                  TERRA
                  <br />
                  STATE
                </span>
              </div>
              <span className="font-heading text-[22px] font-bold text-foreground">
                MyCommunity
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Magic link sent confirmation */}
          {magicSent ? (
            <div className="rounded-md bg-teal-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-teal">
                Check your email
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a sign-in link to your email address.
              </p>
              <Button
                variant="ghost"
                className="mt-4 text-xs"
                onClick={() => setMagicSent(false)}
              >
                Back to login
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="password">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic">Magic Link</TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form
                  onSubmit={handleCredentialsSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic">
                <form
                  onSubmit={handleMagicLinkSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="you@example.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-teal hover:bg-teal-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Magic Link"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    We&apos;ll email you a secure sign-in link
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds, `/(public)/login` route appears.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/login/
git commit -m "feat: add tabbed login page with credentials and magic link"
```

---

### Task 12: Set password page and API route

**Files:**
- Create: `src/app/(public)/set-password/page.tsx`
- Create: `src/app/api/set-password/route.ts`

- [ ] **Step 1: Create the set-password API route**

Create `src/app/api/set-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await request.json();

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(password, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { hashedPassword },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create the set-password page**

Create `src/app/(public)/set-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SessionProvider } from "next-auth/react";

function SetPasswordForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }

    // Redirect to role-based dashboard
    const role = session?.user?.role;
    if (role === "OWNER") router.push("/(owner)/dashboard");
    else if (role === "MANAGER") router.push("/(manager)/dashboard");
    else if (role === "ADMIN") router.push("/(admin)/dashboard");
    else router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <Card className="w-full max-w-[400px] border-cream-300 shadow-md">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center bg-crimson">
                <span className="text-[7px] font-bold leading-tight text-white text-center">
                  TERRA
                  <br />
                  STATE
                </span>
              </div>
              <span className="font-heading text-[22px] font-bold text-foreground">
                MyCommunity
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Set your password to continue
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting password..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <SessionProvider>
      <SetPasswordForm />
    </SessionProvider>
  );
}
```

- [ ] **Step 3: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/set-password/ src/app/api/set-password/
git commit -m "feat: add set-password page and API for first-time magic link users"
```

---

### Task 13: Add .env.example and update .env with new variables

**Files:**
- Create: `.env.example`
- Modify: `.env`

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```
DATABASE_URL="postgresql://user:password@host:port/dbname"
NEXTAUTH_SECRET="generate-a-secret-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
EMAIL_FROM="MyCommunity <noreply@yourdomain.com>"
```

- [ ] **Step 2: Add RESEND_API_KEY placeholder to .env**

Add the following lines to the end of `.env`:

```
RESEND_API_KEY=""
EMAIL_FROM="MyCommunity <noreply@mycommunity.app>"
```

- [ ] **Step 3: Verify build**

Run:
```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "feat: add .env.example with required environment variables"
```

---

### Task 14: Final build verification and cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Full build check**

Run:
```bash
npx next build
```

Expected: Build succeeds with all routes:
- `/(public)/login`
- `/(public)/set-password`
- `/(owner)/dashboard`
- `/(manager)/dashboard`
- `/(admin)/dashboard`
- `/api/auth/[...nextauth]`
- `/api/set-password`

- [ ] **Step 2: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Push to deploy**

```bash
git push origin main
```

Expected: All commits pushed, Railway auto-deploys.
