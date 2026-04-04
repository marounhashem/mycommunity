# Communications Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the announcement system with manager compose (Tiptap editor, audience targeting, file attachments), owner notification center with unread badge, and manager archive with delivery stats.

**Architecture:** Server Actions for mutations, server-side queries for reads. Tiptap for rich text editing (client component). NotificationLog model tracks per-user delivery and read status. TopBar modified to show notification bell with unread count. Presign endpoint generalized for reuse.

**Tech Stack:** Next.js 14, Prisma 7, Tiptap, Resend, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-comms-module-design.md`

---

### Task 1: Schema — Add NotificationLog model and update Announcement

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add attachmentR2Key and zoneFilter to Announcement model and add notifications relation**

In `prisma/schema.prisma`, replace the Announcement model (lines 168-179) with:

```prisma
model Announcement {
  id              String    @id @default(cuid())
  authorId        String    @map("author_id")
  title           String
  bodyHtml        String    @map("body_html")
  audience        Audience  @default(ALL)
  zoneFilter      String?   @map("zone_filter")
  unitFilter      String?   @map("unit_filter")
  attachmentR2Key String?   @map("attachment_r2_key")
  attachmentName  String?   @map("attachment_name")
  sentAt          DateTime? @map("sent_at")

  author        User              @relation(fields: [authorId], references: [id])
  notifications NotificationLog[]

  @@map("announcements")
}
```

- [ ] **Step 2: Add NotificationLog model**

Add before the closing of the schema file (after the Violation model):

```prisma
model NotificationLog {
  id             String    @id @default(cuid())
  announcementId String    @map("announcement_id")
  userId         String    @map("user_id")
  sentAt         DateTime  @default(now()) @map("sent_at")
  readAt         DateTime? @map("read_at")

  announcement Announcement @relation(fields: [announcementId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([announcementId, userId])
  @@map("notification_logs")
}
```

- [ ] **Step 3: Add notifications relation to User model**

In the User model, add after the `approvedRenovations` relation:

```prisma
  notifications   NotificationLog[]
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add-notification-log-and-update-announcement
```

- [ ] **Step 5: Regenerate Prisma client and verify build**

```bash
npx prisma generate && npx next build
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add NotificationLog model and update Announcement with attachment fields"
```

---

### Task 2: Install Tiptap dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Tiptap packages**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/pm
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install Tiptap editor dependencies"
```

---

### Task 3: Generalize presign endpoint

**Files:**
- Modify: `src/app/api/r2/presign/route.ts`

- [ ] **Step 1: Update presign endpoint to accept prefix**

Replace the entire contents of `src/app/api/r2/presign/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authOptions } from "@/lib/auth";
import { r2, R2_BUCKET } from "@/lib/r2";
import { randomUUID } from "crypto";

const ALLOWED_PREFIXES = ["tickets/pending", "announcements"];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, prefix } = await request.json();

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  const resolvedPrefix = prefix && ALLOWED_PREFIXES.includes(prefix)
    ? prefix
    : "tickets/pending";

  const key = `${resolvedPrefix}/${randomUUID()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2, command, { expiresIn: 600 });

  return NextResponse.json({ url, key });
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/r2/presign/route.ts
git commit -m "feat: generalize presign endpoint to accept prefix param"
```

---

### Task 4: Comms queries

**Files:**
- Create: `src/lib/comms/queries.ts`

- [ ] **Step 1: Create queries file**

Create `src/lib/comms/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notificationLog.count({
    where: { userId, readAt: null },
  });
}

export async function getAnnouncementsForUser(userId: string) {
  return prisma.notificationLog.findMany({
    where: { userId },
    include: {
      announcement: {
        include: { author: true },
      },
    },
    orderBy: { sentAt: "desc" },
  });
}

export async function getAnnouncementById(id: string) {
  return prisma.announcement.findUnique({
    where: { id },
    include: { author: true },
  });
}

export async function getAllAnnouncementsWithStats() {
  const announcements = await prisma.announcement.findMany({
    where: { sentAt: { not: null } },
    include: {
      author: true,
      _count: { select: { notifications: true } },
      notifications: {
        select: { readAt: true },
      },
    },
    orderBy: { sentAt: "desc" },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    audience: a.audience,
    sentAt: a.sentAt,
    authorEmail: a.author.email,
    sentCount: a._count.notifications,
    readCount: a.notifications.filter((n) => n.readAt !== null).length,
  }));
}

export async function getDistinctZones(): Promise<string[]> {
  const zones = await prisma.unit.findMany({
    select: { zone: true },
    distinct: ["zone"],
    orderBy: { zone: "asc" },
  });
  return zones.map((z) => z.zone);
}

export async function getAllUnits() {
  return prisma.unit.findMany({
    select: { id: true, unitNumber: true, zone: true },
    orderBy: { unitNumber: "asc" },
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/comms/queries.ts
git commit -m "feat: add comms queries (unread count, announcements, stats)"
```

---

### Task 5: Comms email utility

**Files:**
- Create: `src/lib/comms/email.ts`

- [ ] **Step 1: Create email utility**

Create `src/lib/comms/email.ts`:

```typescript
import { Resend } from "resend";

export async function sendAnnouncementEmail(
  to: string,
  title: string,
  bodyHtml: string,
  announcementId: string
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>";

  const textPreview = bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200);

  await resend.emails.send({
    from,
    to,
    subject: title,
    html: `
      <div style="max-width:500px;margin:0 auto;padding:24px;font-family:sans-serif">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#7A1022;width:40px;height:40px;line-height:40px;text-align:center">
            <span style="color:white;font-size:8px;font-weight:bold">TERRA<br>STATE</span>
          </div>
        </div>
        <h2 style="text-align:center;color:#2C2014">${title}</h2>
        <p style="color:#6B7F5B;text-align:center">${textPreview}${textPreview.length >= 200 ? "..." : ""}</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${process.env.NEXTAUTH_URL}/owner/announcements/${announcementId}"
             style="background:#7A1022;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            View Announcement
          </a>
        </div>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/comms/email.ts
git commit -m "feat: add announcement email utility via Resend"
```

---

### Task 6: Comms server actions

**Files:**
- Create: `src/lib/comms/actions.ts`

- [ ] **Step 1: Create server actions**

Create `src/lib/comms/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAnnouncementEmail } from "@/lib/comms/email";

export async function sendAnnouncement(data: {
  title: string;
  bodyHtml: string;
  audience: "ALL" | "ZONE" | "UNIT";
  zoneFilter?: string;
  unitFilter?: string;
  attachmentR2Key?: string;
  attachmentName?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  // Create announcement
  const announcement = await prisma.announcement.create({
    data: {
      authorId: session.user.id,
      title: data.title,
      bodyHtml: data.bodyHtml,
      audience: data.audience,
      zoneFilter: data.audience === "ZONE" ? data.zoneFilter : null,
      unitFilter: data.audience === "UNIT" ? data.unitFilter : null,
      attachmentR2Key: data.attachmentR2Key || null,
      attachmentName: data.attachmentName || null,
      sentAt: new Date(),
    },
  });

  // Find target owners
  let ownerUsers: { userId: string; user: { email: string } }[];

  if (data.audience === "ALL") {
    ownerUsers = await prisma.owner.findMany({
      include: { user: { select: { email: true } } },
    });
  } else if (data.audience === "ZONE" && data.zoneFilter) {
    ownerUsers = await prisma.owner.findMany({
      where: { unit: { zone: data.zoneFilter } },
      include: { user: { select: { email: true } } },
    });
  } else if (data.audience === "UNIT" && data.unitFilter) {
    ownerUsers = await prisma.owner.findMany({
      where: { unitId: data.unitFilter },
      include: { user: { select: { email: true } } },
    });
  } else {
    ownerUsers = [];
  }

  // Deduplicate by userId
  const uniqueUsers = new Map<string, string>();
  for (const o of ownerUsers) {
    uniqueUsers.set(o.userId, o.user.email);
  }

  // Create notification logs and send emails
  for (const [userId, email] of uniqueUsers) {
    await prisma.notificationLog.create({
      data: {
        announcementId: announcement.id,
        userId,
      },
    });

    await sendAnnouncementEmail(
      email,
      data.title,
      data.bodyHtml,
      announcement.id
    ).catch(console.error);
  }

  revalidatePath("/manager/announcements");
  revalidatePath("/owner/announcements");

  return announcement.id;
}

export async function markAsRead(announcementId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.notificationLog.updateMany({
    where: {
      announcementId,
      userId: session.user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/owner/announcements");
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/comms/actions.ts
git commit -m "feat: add comms server actions (sendAnnouncement, markAsRead)"
```

---

### Task 7: Nav bell — Modify TopBar and AppShell for unread count

**Files:**
- Modify: `src/components/top-bar.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/(owner)/layout.tsx`
- Modify: `src/app/(manager)/layout.tsx`
- Modify: `src/app/(admin)/layout.tsx`

- [ ] **Step 1: Update TopBar to show bell icon with unread badge**

Replace the entire contents of `src/components/top-bar.tsx` with:

```tsx
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
```

- [ ] **Step 2: Update AppShell to pass unreadCount**

Replace the entire contents of `src/components/app-shell.tsx` with:

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
```

- [ ] **Step 3: Update owner layout to pass unreadCount**

Replace the entire contents of `src/app/(owner)/layout.tsx` with:

```tsx
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
```

- [ ] **Step 4: Update manager layout to pass unreadCount**

Replace the entire contents of `src/app/(manager)/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { managerLinks } from "@/lib/nav-links";
import { getUnreadCount } from "@/lib/comms/queries";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unreadCount = await getUnreadCount(session.user.id);

  return (
    <AppShell
      links={managerLinks}
      basePath="/manager"
      userName={session.user.email ?? ""}
      userRole={session.user.role}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 5: Update admin layout to pass unreadCount**

Replace the entire contents of `src/app/(admin)/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { adminLinks } from "@/lib/nav-links";
import { getUnreadCount } from "@/lib/comms/queries";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unreadCount = await getUnreadCount(session.user.id);

  return (
    <AppShell
      links={adminLinks}
      basePath="/admin"
      userName={session.user.email ?? ""}
      userRole={session.user.role}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
npx next build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/top-bar.tsx src/components/app-shell.tsx "src/app/(owner)/layout.tsx" "src/app/(manager)/layout.tsx" "src/app/(admin)/layout.tsx"
git commit -m "feat: add notification bell with unread count to nav bar"
```

---

### Task 8: Add Compose nav link for managers

**Files:**
- Modify: `src/lib/nav-links.ts`

- [ ] **Step 1: Add Send icon import and Compose link**

In `src/lib/nav-links.ts`, add `Send` to the lucide imports:

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
  Send,
  type LucideIcon,
} from "lucide-react";
```

Then in `managerLinks`, add after the Announcements entry:

```typescript
  { label: "Compose", href: "/comms/new", icon: Send },
```

And in `adminLinks`, add after the Announcements entry:

```typescript
  { label: "Compose", href: "/comms/new", icon: Send },
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/nav-links.ts
git commit -m "feat: add Compose link to manager and admin nav"
```

---

### Task 9: Tiptap editor and audience selector components

**Files:**
- Create: `src/components/comms/tiptap-editor.tsx`
- Create: `src/components/comms/audience-selector.tsx`
- Create: `src/components/comms/file-attachment.tsx`

- [ ] **Step 1: Create Tiptap editor component**

Create `src/components/comms/tiptap-editor.tsx`:

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Link as LinkIcon } from "lucide-react";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  function handleLink() {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor!.chain().focus().setLink({ href: url }).run();
    }
  }

  return (
    <div className="rounded-md border border-input">
      <div className="flex gap-1 border-b border-input p-1.5 bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive("bold") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive("italic") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive("bulletList") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive("orderedList") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive("link") ? "bg-muted" : ""}`}
          onClick={handleLink}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create audience selector component**

Create `src/components/comms/audience-selector.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AudienceSelectorProps {
  audience: string;
  zoneFilter: string;
  unitFilter: string;
  zones: string[];
  units: { id: string; unitNumber: string; zone: string }[];
  onAudienceChange: (v: string) => void;
  onZoneChange: (v: string) => void;
  onUnitChange: (v: string) => void;
}

export function AudienceSelector({
  audience,
  zoneFilter,
  unitFilter,
  zones,
  units,
  onAudienceChange,
  onZoneChange,
  onUnitChange,
}: AudienceSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Audience</Label>
        <Select value={audience} onValueChange={onAudienceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Owners</SelectItem>
            <SelectItem value="ZONE">By Zone</SelectItem>
            <SelectItem value="UNIT">Specific Unit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {audience === "ZONE" && (
        <div className="space-y-2">
          <Label>Zone</Label>
          <Select value={zoneFilter} onValueChange={onZoneChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {audience === "UNIT" && (
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select value={unitFilter} onValueChange={onUnitChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  Unit {u.unitNumber} ({u.zone})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create file attachment component**

Create `src/components/comms/file-attachment.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileAttachmentProps {
  onFileChange: (file: { key: string; filename: string } | null) => void;
}

export function FileAttachment({ onFileChange }: FileAttachmentProps) {
  const [file, setFile] = useState<{ key: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setUploading(true);
    try {
      const res = await fetch("/api/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selected.name,
          contentType: selected.type,
          prefix: "announcements",
        }),
      });
      const { url, key } = await res.json();

      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": selected.type },
        body: selected,
      });

      const uploaded = { key, filename: selected.name };
      setFile(uploaded);
      onFileChange(uploaded);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setFile(null);
    onFileChange(null);
  }

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="truncate flex-1">{file.filename}</span>
          <button type="button" onClick={handleRemove}>
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4 mr-1" />
          {uploading ? "Uploading..." : "Attach File"}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/comms/
git commit -m "feat: add Tiptap editor, audience selector, and file attachment components"
```

---

### Task 10: Manager compose page

**Files:**
- Create: `src/app/(manager)/manager/comms/new/page.tsx`

- [ ] **Step 1: Create compose page**

Create `src/app/(manager)/manager/comms/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDistinctZones, getAllUnits } from "@/lib/comms/queries";
import { ComposeForm } from "./compose-form";

export default async function ComposePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [zones, units] = await Promise.all([
    getDistinctZones(),
    getAllUnits(),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Compose Announcement
      </h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Send an announcement to community owners
      </p>
      <ComposeForm zones={zones} units={units} />
    </div>
  );
}
```

- [ ] **Step 2: Create ComposeForm client component**

Create `src/app/(manager)/manager/comms/new/compose-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AudienceSelector } from "@/components/comms/audience-selector";
import { FileAttachment } from "@/components/comms/file-attachment";
import { sendAnnouncement } from "@/lib/comms/actions";
import { Eye, Send } from "lucide-react";

const TiptapEditor = dynamic(
  () => import("@/components/comms/tiptap-editor").then((m) => m.TiptapEditor),
  { ssr: false }
);

interface ComposeFormProps {
  zones: string[];
  units: { id: string; unitNumber: string; zone: string }[];
}

export function ComposeForm({ zones, units }: ComposeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [zoneFilter, setZoneFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [attachment, setAttachment] = useState<{ key: string; filename: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const canSend = title.trim() && bodyHtml.trim() && bodyHtml !== "<p></p>";

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError("");

    try {
      await sendAnnouncement({
        title: title.trim(),
        bodyHtml,
        audience: audience as "ALL" | "ZONE" | "UNIT",
        zoneFilter: zoneFilter || undefined,
        unitFilter: unitFilter || undefined,
        attachmentR2Key: attachment?.key,
        attachmentName: attachment?.filename,
      });
      router.push("/manager/announcements");
    } catch {
      setError("Failed to send announcement");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Subject</Label>
        <Input
          placeholder="Announcement title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <AudienceSelector
        audience={audience}
        zoneFilter={zoneFilter}
        unitFilter={unitFilter}
        zones={zones}
        units={units}
        onAudienceChange={setAudience}
        onZoneChange={setZoneFilter}
        onUnitChange={setUnitFilter}
      />

      {preview ? (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-xl font-bold mb-4">{title || "Untitled"}</h2>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <Label>Body</Label>
          <TiptapEditor content={bodyHtml} onChange={setBodyHtml} />
        </div>
      )}

      <div className="space-y-2">
        <Label>Attachment (optional)</Label>
        <FileAttachment onFileChange={setAttachment} />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPreview(!preview)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {preview ? "Edit" : "Preview"}
        </Button>
        <Button
          onClick={handleSend}
          disabled={!canSend || sending}
        >
          <Send className="h-4 w-4 mr-1" />
          {sending ? "Sending..." : "Send Announcement"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(manager)/manager/comms/"
git commit -m "feat: add manager compose announcement page with Tiptap editor"
```

---

### Task 11: Manager archive page

**Files:**
- Create: `src/app/(manager)/manager/announcements/page.tsx`

- [ ] **Step 1: Create archive page**

Create `src/app/(manager)/manager/announcements/page.tsx`:

```tsx
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
            <div
              key={a.id}
              className="grid grid-cols-[2fr_1fr_1fr_80px_80px] gap-4 px-4 py-3 border-t border-border text-sm"
            >
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
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(manager)/manager/announcements/"
git commit -m "feat: add manager announcements archive with delivery stats"
```

---

### Task 12: Owner notification center

**Files:**
- Create: `src/app/(owner)/owner/announcements/page.tsx`
- Create: `src/app/(owner)/owner/announcements/[id]/page.tsx`

- [ ] **Step 1: Create owner announcements list page**

Create `src/app/(owner)/owner/announcements/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Create owner announcement detail page with mark-as-read**

Create `src/app/(owner)/owner/announcements/[id]/page.tsx`:

```tsx
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAnnouncementById } from "@/lib/comms/queries";
import { markAsRead } from "@/lib/comms/actions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Paperclip } from "lucide-react";

const audienceLabels: Record<string, string> = {
  ALL: "All Owners",
  ZONE: "By Zone",
  UNIT: "Specific Unit",
};

export default async function OwnerAnnouncementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const announcement = await getAnnouncementById(params.id);
  if (!announcement) notFound();

  // Mark as read
  await markAsRead(announcement.id);

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-2xl">
      <Link
        href="/owner/announcements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to announcements
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {announcement.title}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">
            {audienceLabels[announcement.audience] || announcement.audience}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {announcement.sentAt
              ? new Date(announcement.sentAt).toLocaleDateString()
              : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            by {announcement.author.email}
          </span>
        </div>
      </div>

      <div
        className="prose prose-sm max-w-none mb-6"
        dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
      />

      {announcement.attachmentR2Key && (
        <div className="flex items-center gap-2 rounded-md border border-border px-4 py-3">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <a
            href={`${publicUrl}/${announcement.attachmentR2Key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {announcement.attachmentName || "Download attachment"}
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(owner)/owner/announcements/"
git commit -m "feat: add owner notification center with mark-as-read"
```

---

### Task 13: Final verification and push

- [ ] **Step 1: Full build check**

```bash
npx next build
```

Expected routes include:
- `/manager/comms/new` (dynamic)
- `/manager/announcements` (dynamic)
- `/owner/announcements` (dynamic)
- `/owner/announcements/[id]` (dynamic)

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Push**

```bash
git push origin main
```
