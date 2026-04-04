# Tickets Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the request & complaint management system with owner ticket submission (R2 photo uploads), manager kanban board, comment threads with internal notes, email notifications, and satisfaction surveys.

**Architecture:** Server Actions for mutations, server-side queries for reads. Presigned URL flow for R2 uploads. Kanban with @hello-pangea/dnd. Email via Resend on status changes. All pages are server components that fetch data, with client interactive parts extracted into focused components.

**Tech Stack:** Next.js 14, Prisma 7, @aws-sdk/client-s3, @hello-pangea/dnd, Resend, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-tickets-module-design.md`

---

### Task 1: Schema migration — Add description field to Ticket

**Files:**
- Modify: `prisma/schema.prisma:123-138`

The Ticket model needs a `description` field for the owner's request text.

- [ ] **Step 1: Add description field to Ticket model**

In `prisma/schema.prisma`, after the `category` field (line 127), add:

```prisma
  description     String         @default("")
```

So the Ticket model becomes:

```prisma
model Ticket {
  id                String         @id @default(cuid())
  unitId            String         @map("unit_id")
  assignedTo        String?        @map("assigned_to")
  category          String
  description       String         @default("")
  priority          TicketPriority @default(MEDIUM)
  status            TicketStatus   @default(OPEN)
  dueDate           DateTime?      @map("due_date")
  satisfactionScore Int?           @map("satisfaction_score")
  createdAt         DateTime       @default(now()) @map("created_at")

  unit        Unit              @relation(fields: [unitId], references: [id])
  assignee    User?             @relation("AssignedTickets", fields: [assignedTo], references: [id])
  comments    TicketComment[]
  attachments TicketAttachment[]

  @@map("tickets")
}
```

Note: also add `createdAt` for sorting tickets by newest first.

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-ticket-description-and-created-at
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Verify build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add description and createdAt fields to Ticket model"
```

---

### Task 2: Install dependencies — R2 SDK, DnD, shadcn components

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install npm packages**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @hello-pangea/dnd
```

- [ ] **Step 2: Install shadcn/ui components**

```bash
npx shadcn@latest add select textarea dialog dropdown-menu tooltip --yes
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/ui/
git commit -m "feat: install R2 SDK, DnD library, and shadcn components for tickets module"
```

---

### Task 3: R2 client and presigned URL endpoint

**Files:**
- Create: `src/lib/r2.ts`
- Create: `src/app/api/r2/presign/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create R2 client**

Create `src/lib/r2.ts`:

```typescript
import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
```

- [ ] **Step 2: Create presign API route**

Create `src/app/api/r2/presign/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authOptions } from "@/lib/auth";
import { r2, R2_BUCKET } from "@/lib/r2";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType } = await request.json();

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  const key = `tickets/pending/${randomUUID()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2, command, { expiresIn: 600 });

  return NextResponse.json({ url, key });
}
```

- [ ] **Step 3: Add R2 env vars to .env.example**

Add to `.env.example`:

```
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

- [ ] **Step 4: Add R2 env vars to .env**

Add to `.env`:

```
# Cloudflare R2
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

- [ ] **Step 5: Verify build**

```bash
npx next build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/r2.ts src/app/api/r2/presign/ .env.example
git commit -m "feat: add R2 client and presigned URL endpoint for file uploads"
```

---

### Task 4: Ticket queries

**Files:**
- Create: `src/lib/tickets/queries.ts`

- [ ] **Step 1: Create queries file**

Create `src/lib/tickets/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function getTicketsByUnit(unitIds: string[]) {
  return prisma.ticket.findMany({
    where: { unitId: { in: unitIds } },
    include: {
      unit: true,
      assignee: true,
      attachments: true,
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllTickets(filters?: {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.category) where.category = filters.category;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.assignedTo) where.assignedTo = filters.assignedTo;

  return prisma.ticket.findMany({
    where,
    include: {
      unit: true,
      assignee: true,
      attachments: true,
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTicketById(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      unit: true,
      assignee: true,
      attachments: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getOwnerUnitIds(userId: string): Promise<string[]> {
  const owners = await prisma.owner.findMany({
    where: { userId },
    select: { unitId: true },
  });
  return owners.map((o) => o.unitId);
}

export async function getManagerUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] } },
    select: { id: true, email: true },
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/tickets/queries.ts
git commit -m "feat: add ticket database queries"
```

---

### Task 5: Ticket email notifications

**Files:**
- Create: `src/lib/tickets/email.ts`

- [ ] **Step 1: Create email utility**

Create `src/lib/tickets/email.ts`:

```typescript
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export async function sendTicketStatusEmail(
  ticketId: string,
  newStatus: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      unit: {
        include: {
          owners: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!ticket) return;

  const ownerEmails = ticket.unit.owners
    .map((o) => o.user.email)
    .filter(Boolean);

  if (ownerEmails.length === 0) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>";
  const statusLabel = newStatus.replace("_", " ");
  const ticketLabel = `${ticket.category} - Unit ${ticket.unit.unitNumber}`;

  for (const email of ownerEmails) {
    await resend.emails.send({
      from,
      to: email,
      subject: `Request Updated: ${ticketLabel}`,
      html: `
        <div style="max-width:400px;margin:0 auto;padding:24px;font-family:sans-serif">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;background:#7A1022;width:40px;height:40px;line-height:40px;text-align:center">
              <span style="color:white;font-size:8px;font-weight:bold">TERRA<br>STATE</span>
            </div>
          </div>
          <h2 style="text-align:center;color:#2C2014">Request Updated</h2>
          <p style="color:#6B7F5B;text-align:center">
            Your request <strong>${ticketLabel}</strong> has been updated to
            <strong style="color:#2C2014">${statusLabel}</strong>.
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${process.env.NEXTAUTH_URL}/owner/tickets/${ticketId}"
               style="background:#7A1022;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
              View Request
            </a>
          </div>
        </div>
      `,
    });
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/tickets/email.ts
git commit -m "feat: add ticket status change email notifications via Resend"
```

---

### Task 6: Ticket server actions

**Files:**
- Create: `src/lib/tickets/actions.ts`

- [ ] **Step 1: Create server actions**

Create `src/lib/tickets/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTicketStatusEmail } from "@/lib/tickets/email";

export async function createTicket(data: {
  unitId: string;
  category: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  attachmentKeys: { key: string; filename: string }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticket = await prisma.ticket.create({
    data: {
      unitId: data.unitId,
      category: data.category,
      description: data.description,
      priority: data.priority,
      attachments: {
        create: data.attachmentKeys.map((a) => ({
          r2Key: a.key,
          filename: a.filename,
        })),
      },
    },
  });

  revalidatePath("/owner/tickets");
  revalidatePath("/manager/tickets");
  return ticket;
}

export async function updateTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status },
  });

  await sendTicketStatusEmail(ticketId, status).catch(console.error);

  revalidatePath("/owner/tickets");
  revalidatePath("/manager/tickets");
  revalidatePath(`/owner/tickets/${ticketId}`);
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function assignTicket(ticketId: string, userId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedTo: userId },
  });

  revalidatePath("/manager/tickets");
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function updateTicketPriority(
  ticketId: string,
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority },
  });

  revalidatePath("/manager/tickets");
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function setTicketDueDate(ticketId: string, dueDate: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { dueDate: dueDate ? new Date(dueDate) : null },
  });

  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function addComment(
  ticketId: string,
  body: string,
  isInternal: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Owners can only add public comments
  if (session.user.role === "OWNER" && isInternal) {
    throw new Error("Owners cannot post internal notes");
  }

  await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: session.user.id,
      body,
      isInternal,
    },
  });

  revalidatePath(`/owner/tickets/${ticketId}`);
  revalidatePath(`/manager/tickets/${ticketId}`);
}

export async function rateTicket(ticketId: string, score: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (score < 1 || score > 5) throw new Error("Score must be 1-5");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket || ticket.status !== "CLOSED") {
    throw new Error("Can only rate closed tickets");
  }

  if (ticket.satisfactionScore !== null) {
    throw new Error("Already rated");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { satisfactionScore: score },
  });

  revalidatePath(`/owner/tickets/${ticketId}`);
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/tickets/actions.ts
git commit -m "feat: add ticket server actions (create, status, assign, comment, rate)"
```

---

### Task 7: Shared ticket components — TicketCard, StarRating, PhotoUpload

**Files:**
- Create: `src/components/tickets/ticket-card.tsx`
- Create: `src/components/tickets/star-rating.tsx`
- Create: `src/components/tickets/photo-upload.tsx`

- [ ] **Step 1: Create TicketCard component**

Create `src/components/tickets/ticket-card.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const priorityColors: Record<string, string> = {
  LOW: "bg-sage-100 text-sage-700",
  MEDIUM: "bg-gold-100 text-gold-700",
  HIGH: "bg-crimson-100 text-crimson-700",
  URGENT: "bg-crimson-200 text-crimson-900",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  CLOSED: "bg-cream-300 text-cream-800",
};

interface TicketCardProps {
  id: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  unitNumber: string;
  assigneeEmail?: string | null;
  dueDate?: Date | null;
  createdAt: Date;
  commentCount: number;
  href: string;
}

export function TicketCard({
  category,
  description,
  priority,
  status,
  unitNumber,
  assigneeEmail,
  dueDate,
  createdAt,
  commentCount,
  href,
}: TicketCardProps) {
  const isUrgent = priority === "HIGH" || priority === "URGENT";

  return (
    <a href={href} className="block">
      <Card
        className={`transition-shadow hover:shadow-md ${
          isUrgent ? "border-l-4 border-l-crimson" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-foreground truncate">
                {category} — Unit {unitNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {description}
              </p>
            </div>
            <Badge variant="outline" className={statusColors[status] || ""}>
              {status.replace("_", " ")}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={`text-[10px] ${priorityColors[priority] || ""}`}>
              {priority}
            </Badge>
            {assigneeEmail && (
              <span className="truncate max-w-[120px]">{assigneeEmail}</span>
            )}
            {dueDate && (
              <span>Due {new Date(dueDate).toLocaleDateString()}</span>
            )}
            <span className="ml-auto">{commentCount} comments</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </a>
  );
}
```

- [ ] **Step 2: Create StarRating component**

Create `src/components/tickets/star-rating.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { rateTicket } from "@/lib/tickets/actions";

interface StarRatingProps {
  ticketId: string;
  currentScore: number | null;
}

export function StarRating({ ticketId, currentScore }: StarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(currentScore);

  if (score !== null) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-2">Your rating:</span>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i <= score ? "fill-gold text-gold" : "text-cream-400"
            }`}
          />
        ))}
      </div>
    );
  }

  async function handleRate(value: number) {
    setSubmitting(true);
    try {
      await rateTicket(ticketId, value);
      setScore(value);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg bg-gold-50 p-4">
      <p className="text-sm font-medium text-foreground mb-2">
        How was your experience?
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            disabled={submitting}
            onMouseEnter={() => setHoveredStar(i)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleRate(i)}
            className="disabled:opacity-50"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                i <= hoveredStar
                  ? "fill-gold text-gold"
                  : "text-cream-400 hover:text-gold-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PhotoUpload component**

Create `src/components/tickets/photo-upload.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadedFile {
  key: string;
  filename: string;
  previewUrl: string;
}

interface PhotoUploadProps {
  maxFiles?: number;
  onFilesChange: (files: { key: string; filename: string }[]) => void;
}

export function PhotoUpload({ maxFiles = 3, onFilesChange }: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const remaining = maxFiles - files.length;
    const toUpload = Array.from(selected).slice(0, remaining);

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of toUpload) {
      try {
        const res = await fetch("/api/r2/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });
        const { url, key } = await res.json();

        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        newFiles.push({
          key,
          filename: file.name,
          previewUrl: URL.createObjectURL(file),
        });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    const updated = [...files, ...newFiles];
    setFiles(updated);
    onFilesChange(updated.map((f) => ({ key: f.key, filename: f.filename })));
    setUploading(false);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange(updated.map((f) => ({ key: f.key, filename: f.filename })));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {files.map((file, i) => (
          <div key={file.key} className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
            <img
              src={file.previewUrl}
              alt={file.filename}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeFile(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {files.length < maxFiles && (
          <Button
            type="button"
            variant="outline"
            className="w-20 h-20 flex flex-col items-center justify-center gap-1"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {uploading ? "..." : "Photo"}
            </span>
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
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
git add src/components/tickets/
git commit -m "feat: add TicketCard, StarRating, and PhotoUpload components"
```

---

### Task 8: Comment thread component

**Files:**
- Create: `src/components/tickets/comment-thread.tsx`

- [ ] **Step 1: Create CommentThread component**

Create `src/components/tickets/comment-thread.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { addComment } from "@/lib/tickets/actions";

interface Comment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  author: {
    email: string;
    role: string;
  };
}

interface CommentThreadProps {
  ticketId: string;
  comments: Comment[];
  showInternal: boolean;
  canPostInternal: boolean;
}

export function CommentThread({
  ticketId,
  comments,
  showInternal,
  canPostInternal,
}: CommentThreadProps) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visibleComments = showInternal
    ? comments
    : comments.filter((c) => !c.isInternal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    try {
      await addComment(ticketId, body.trim(), isInternal);
      setBody("");
      setIsInternal(false);
    } finally {
      setSubmitting(false);
    }
  }

  const initials = (email: string) =>
    email
      .split("@")[0]
      .split(".")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold">Comments</h3>

      {visibleComments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {visibleComments.map((comment) => (
        <div
          key={comment.id}
          className={`flex gap-3 rounded-lg p-3 ${
            comment.isInternal
              ? "bg-sage-50 border border-sage-200"
              : "bg-card border border-border"
          }`}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-gold text-white text-xs">
              {initials(comment.author.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">
                {comment.author.email}
              </span>
              {comment.isInternal && (
                <Badge variant="outline" className="text-[10px] bg-sage-100 text-sage-700">
                  Internal
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {comment.body}
            </p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          <div>
            {canPostInternal && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                Internal note
              </label>
            )}
          </div>
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>
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
git add src/components/tickets/comment-thread.tsx
git commit -m "feat: add CommentThread component with internal notes support"
```

---

### Task 9: Owner ticket list page

**Files:**
- Create: `src/app/(owner)/owner/tickets/page.tsx`

- [ ] **Step 1: Create owner ticket list page**

Create `src/app/(owner)/owner/tickets/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketsByUnit, getOwnerUnitIds } from "@/lib/tickets/queries";
import { TicketCard } from "@/components/tickets/ticket-card";
import { NewTicketDialog } from "./new-ticket-dialog";
import { TicketStatusTabs } from "./ticket-status-tabs";

export default async function OwnerTicketsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const allTickets = await getTicketsByUnit(unitIds);

  const statusFilter = searchParams.status || "ALL";
  const tickets =
    statusFilter === "ALL"
      ? allTickets
      : allTickets.filter((t) => t.status === statusFilter);

  const counts = {
    ALL: allTickets.length,
    OPEN: allTickets.filter((t) => t.status === "OPEN").length,
    IN_PROGRESS: allTickets.filter((t) => t.status === "IN_PROGRESS").length,
    RESOLVED: allTickets.filter((t) => t.status === "RESOLVED").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            My Tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit and track your requests
          </p>
        </div>
        <NewTicketDialog unitIds={unitIds} />
      </div>

      <TicketStatusTabs currentStatus={statusFilter} counts={counts} />

      <div className="mt-4 space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No tickets found.
          </p>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              id={ticket.id}
              category={ticket.category}
              description={ticket.description}
              priority={ticket.priority}
              status={ticket.status}
              unitNumber={ticket.unit.unitNumber}
              assigneeEmail={ticket.assignee?.email}
              dueDate={ticket.dueDate}
              createdAt={ticket.createdAt}
              commentCount={ticket._count.comments}
              href={`/owner/tickets/${ticket.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TicketStatusTabs client component**

Create `src/app/(owner)/owner/tickets/ticket-status-tabs.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TicketStatusTabsProps {
  currentStatus: string;
  counts: Record<string, number>;
}

export function TicketStatusTabs({ currentStatus, counts }: TicketStatusTabsProps) {
  const router = useRouter();

  function handleChange(value: string) {
    const params = value === "ALL" ? "" : `?status=${value}`;
    router.push(`/owner/tickets${params}`);
  }

  return (
    <Tabs value={currentStatus} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="ALL">All ({counts.ALL})</TabsTrigger>
        <TabsTrigger value="OPEN">Open ({counts.OPEN})</TabsTrigger>
        <TabsTrigger value="IN_PROGRESS">In Progress ({counts.IN_PROGRESS})</TabsTrigger>
        <TabsTrigger value="RESOLVED">Resolved ({counts.RESOLVED})</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 3: Create NewTicketDialog client component**

Create `src/app/(owner)/owner/tickets/new-ticket-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUpload } from "@/components/tickets/photo-upload";
import { createTicket } from "@/lib/tickets/actions";
import { Plus } from "lucide-react";

const CATEGORIES = ["Maintenance", "Cleaning", "Security", "Landscaping", "Other"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

interface NewTicketDialogProps {
  unitIds: string[];
}

export function NewTicketDialog({ unitIds }: NewTicketDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<{ key: string; filename: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !description.trim()) {
      setError("Category and description are required");
      return;
    }
    if (unitIds.length === 0) {
      setError("No unit associated with your account");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createTicket({
        unitId: unitIds[0],
        category,
        description: description.trim(),
        priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        attachmentKeys: attachments,
      });
      setOpen(false);
      setCategory("");
      setPriority("MEDIUM");
      setDescription("");
      setAttachments([]);
      router.refresh();
    } catch {
      setError("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Submit a Request
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe your request..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Photos (optional, max 3)</Label>
            <PhotoUpload maxFiles={3} onFilesChange={setAttachments} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/(owner)/owner/tickets/"
git commit -m "feat: add owner ticket list page with status tabs and new ticket dialog"
```

---

### Task 10: Owner ticket detail page

**Files:**
- Create: `src/app/(owner)/owner/tickets/[id]/page.tsx`

- [ ] **Step 1: Create owner ticket detail page**

Create `src/app/(owner)/owner/tickets/[id]/page.tsx`:

```tsx
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketById, getOwnerUnitIds } from "@/lib/tickets/queries";
import { Badge } from "@/components/ui/badge";
import { CommentThread } from "@/components/tickets/comment-thread";
import { StarRating } from "@/components/tickets/star-rating";
import { R2_PUBLIC_URL } from "@/lib/r2";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const priorityColors: Record<string, string> = {
  LOW: "bg-sage-100 text-sage-700",
  MEDIUM: "bg-gold-100 text-gold-700",
  HIGH: "bg-crimson-100 text-crimson-700",
  URGENT: "bg-crimson-200 text-crimson-900",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  CLOSED: "bg-cream-300 text-cream-800",
};

export default async function OwnerTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const ticket = await getTicketById(params.id);

  if (!ticket || !unitIds.includes(ticket.unitId)) notFound();

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-3xl">
      <Link
        href="/owner/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      {/* Satisfaction survey */}
      {ticket.status === "CLOSED" && (
        <div className="mb-6">
          <StarRating
            ticketId={ticket.id}
            currentScore={ticket.satisfactionScore}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {ticket.category} — Unit {ticket.unit.unitNumber}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={statusColors[ticket.status] || ""}>
            {ticket.status.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className={priorityColors[ticket.priority] || ""}>
            {ticket.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {ticket.description}
        </p>
      </div>

      {/* Photo gallery */}
      {ticket.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading text-lg font-semibold mb-2">Photos</h3>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((att) => (
              <a
                key={att.id}
                href={`${publicUrl}/${att.r2Key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-24 h-24 rounded-md overflow-hidden border border-border"
              >
                <img
                  src={`${publicUrl}/${att.r2Key}`}
                  alt={att.filename}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Comments — hide internal */}
      <CommentThread
        ticketId={ticket.id}
        comments={ticket.comments.map((c) => ({
          id: c.id,
          body: c.body,
          isInternal: c.isInternal,
          createdAt: c.createdAt,
          author: { email: c.author.email, role: c.author.role },
        }))}
        showInternal={false}
        canPostInternal={false}
      />
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
git add "src/app/(owner)/owner/tickets/[id]/"
git commit -m "feat: add owner ticket detail page with comments and satisfaction rating"
```

---

### Task 11: Kanban board component

**Files:**
- Create: `src/components/tickets/kanban-board.tsx`
- Create: `src/components/tickets/ticket-filters.tsx`

- [ ] **Step 1: Create TicketFilters component**

Create `src/components/tickets/ticket-filters.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["All", "Maintenance", "Cleaning", "Security", "Landscaping", "Other"];
const PRIORITIES = ["All", "LOW", "MEDIUM", "HIGH", "URGENT"];

interface TicketFiltersProps {
  managers: { id: string; email: string }[];
  category: string;
  priority: string;
  assignee: string;
  onCategoryChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onAssigneeChange: (v: string) => void;
}

export function TicketFilters({
  managers,
  category,
  priority,
  assignee,
  onCategoryChange,
  onPriorityChange,
  onAssigneeChange,
}: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p === "All" ? "All Priorities" : p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={assignee} onValueChange={onAssigneeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {managers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Create KanbanBoard component**

Create `src/components/tickets/kanban-board.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateTicketStatus } from "@/lib/tickets/actions";
import { TicketFilters } from "./ticket-filters";

interface KanbanTicket {
  id: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  unitNumber: string;
  assigneeEmail: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
}

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  managers: { id: string; email: string }[];
}

const COLUMNS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const columnLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const columnColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  CLOSED: "bg-cream-300 text-cream-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-sage-100 text-sage-700",
  MEDIUM: "bg-gold-100 text-gold-700",
  HIGH: "bg-crimson-100 text-crimson-700",
  URGENT: "bg-crimson-200 text-crimson-900",
};

export function KanbanBoard({ tickets: initialTickets, managers }: KanbanBoardProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");

  const filtered = tickets.filter((t) => {
    if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
    if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
    if (assigneeFilter === "unassigned" && t.assigneeId !== null) return false;
    if (assigneeFilter !== "All" && assigneeFilter !== "unassigned" && t.assigneeId !== assigneeFilter) return false;
    return true;
  });

  function getColumnTickets(status: string) {
    return filtered.filter((t) => t.status === status);
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const ticketId = result.draggableId;
    const newStatus = result.destination.droppableId as typeof COLUMNS[number];

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTicketStatus(ticketId, newStatus);
    } catch {
      setTickets(initialTickets);
    }
  }

  const initials = (email: string) =>
    email.split("@")[0].split(".").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div>
      <TicketFilters
        managers={managers}
        category={categoryFilter}
        priority={priorityFilter}
        assignee={assigneeFilter}
        onCategoryChange={setCategoryFilter}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTickets = getColumnTickets(col);
            return (
              <div key={col}>
                <div className="flex items-center justify-between px-3 py-2 bg-cream-100 rounded-t-lg">
                  <span className="text-sm font-semibold text-foreground">
                    {columnLabels[col]}
                  </span>
                  <Badge className={columnColors[col]} variant="secondary">
                    {colTickets.length}
                  </Badge>
                </div>
                <Droppable droppableId={col}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-[200px] bg-white border border-border border-t-0 rounded-b-lg p-2 space-y-2"
                    >
                      {colTickets.map((ticket, index) => {
                        const isUrgent = ticket.priority === "HIGH" || ticket.priority === "URGENT";
                        return (
                          <Draggable
                            key={ticket.id}
                            draggableId={ticket.id}
                            index={index}
                          >
                            {(provided) => (
                              <a
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                href={`/manager/tickets/${ticket.id}`}
                                className={`block rounded-md border border-border p-3 bg-card hover:shadow-sm transition-shadow ${
                                  isUrgent ? "border-l-4 border-l-crimson" : ""
                                }`}
                              >
                                <p className="text-sm font-medium text-foreground truncate">
                                  {ticket.category} — Unit {ticket.unitNumber}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {ticket.description}
                                </p>
                                <div className="mt-2 flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${priorityColors[ticket.priority]}`}
                                  >
                                    {ticket.priority}
                                  </Badge>
                                  {ticket.assigneeEmail ? (
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="bg-gold text-white text-[8px]">
                                        {initials(ticket.assigneeEmail)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      Unassigned
                                    </span>
                                  )}
                                  {ticket.dueDate && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                      {new Date(ticket.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </a>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
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
git add src/components/tickets/kanban-board.tsx src/components/tickets/ticket-filters.tsx
git commit -m "feat: add kanban board with drag-and-drop and ticket filters"
```

---

### Task 12: Manager ticket list (kanban) page

**Files:**
- Create: `src/app/(manager)/manager/tickets/page.tsx`

- [ ] **Step 1: Create manager tickets page**

Create `src/app/(manager)/manager/tickets/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTickets, getManagerUsers } from "@/lib/tickets/queries";
import { KanbanBoard } from "@/components/tickets/kanban-board";

export default async function ManagerTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [tickets, managers] = await Promise.all([
    getAllTickets(),
    getManagerUsers(),
  ]);

  const kanbanTickets = tickets.map((t) => ({
    id: t.id,
    category: t.category,
    description: t.description,
    priority: t.priority,
    status: t.status,
    unitNumber: t.unit.unitNumber,
    assigneeEmail: t.assignee?.email || null,
    assigneeId: t.assignedTo,
    dueDate: t.dueDate,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          All Tickets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and triage community requests
        </p>
      </div>

      <KanbanBoard tickets={kanbanTickets} managers={managers} />
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
git add "src/app/(manager)/manager/tickets/"
git commit -m "feat: add manager kanban ticket view"
```

---

### Task 13: Manager ticket detail page

**Files:**
- Create: `src/app/(manager)/manager/tickets/[id]/page.tsx`

- [ ] **Step 1: Create manager ticket detail page**

Create `src/app/(manager)/manager/tickets/[id]/page.tsx`:

```tsx
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketById, getManagerUsers } from "@/lib/tickets/queries";
import { Badge } from "@/components/ui/badge";
import { CommentThread } from "@/components/tickets/comment-thread";
import { StarRating } from "@/components/tickets/star-rating";
import { ManagerTicketControls } from "./manager-ticket-controls";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const priorityColors: Record<string, string> = {
  LOW: "bg-sage-100 text-sage-700",
  MEDIUM: "bg-gold-100 text-gold-700",
  HIGH: "bg-crimson-100 text-crimson-700",
  URGENT: "bg-crimson-200 text-crimson-900",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  CLOSED: "bg-cream-300 text-cream-800",
};

export default async function ManagerTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [ticket, managers] = await Promise.all([
    getTicketById(params.id),
    getManagerUsers(),
  ]);

  if (!ticket) notFound();

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-3xl">
      <Link
        href="/manager/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {ticket.category} — Unit {ticket.unit.unitNumber}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={statusColors[ticket.status] || ""}>
            {ticket.status.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className={priorityColors[ticket.priority] || ""}>
            {ticket.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Manager controls */}
      <ManagerTicketControls
        ticketId={ticket.id}
        currentStatus={ticket.status}
        currentPriority={ticket.priority}
        currentAssignee={ticket.assignedTo}
        currentDueDate={ticket.dueDate?.toISOString().split("T")[0] || ""}
        managers={managers}
      />

      {/* Description */}
      <div className="mb-6">
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {ticket.description}
        </p>
      </div>

      {/* Photo gallery */}
      {ticket.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading text-lg font-semibold mb-2">Photos</h3>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((att) => (
              <a
                key={att.id}
                href={`${publicUrl}/${att.r2Key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-24 h-24 rounded-md overflow-hidden border border-border"
              >
                <img
                  src={`${publicUrl}/${att.r2Key}`}
                  alt={att.filename}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Satisfaction score */}
      {ticket.satisfactionScore !== null && (
        <div className="mb-6">
          <StarRating ticketId={ticket.id} currentScore={ticket.satisfactionScore} />
        </div>
      )}

      {/* Comments — show internal */}
      <CommentThread
        ticketId={ticket.id}
        comments={ticket.comments.map((c) => ({
          id: c.id,
          body: c.body,
          isInternal: c.isInternal,
          createdAt: c.createdAt,
          author: { email: c.author.email, role: c.author.role },
        }))}
        showInternal={true}
        canPostInternal={true}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create ManagerTicketControls client component**

Create `src/app/(manager)/manager/tickets/[id]/manager-ticket-controls.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  setTicketDueDate,
} from "@/lib/tickets/actions";

interface ManagerTicketControlsProps {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
  currentAssignee: string | null;
  currentDueDate: string;
  managers: { id: string; email: string }[];
}

export function ManagerTicketControls({
  ticketId,
  currentStatus,
  currentPriority,
  currentAssignee,
  currentDueDate,
  managers,
}: ManagerTicketControlsProps) {
  const router = useRouter();

  async function handleStatusChange(value: string) {
    await updateTicketStatus(
      ticketId,
      value as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
    );
    router.refresh();
  }

  async function handlePriorityChange(value: string) {
    await updateTicketPriority(
      ticketId,
      value as "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    );
    router.refresh();
  }

  async function handleAssigneeChange(value: string) {
    await assignTicket(ticketId, value === "unassigned" ? null : value);
    router.refresh();
  }

  async function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    await setTicketDueDate(ticketId, e.target.value || null);
    router.refresh();
  }

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-border p-4 bg-card">
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Priority</Label>
        <Select value={currentPriority} onValueChange={handlePriorityChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Assigned To</Label>
        <Select
          value={currentAssignee || "unassigned"}
          onValueChange={handleAssigneeChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">SLA Due Date</Label>
        <Input
          type="date"
          value={currentDueDate}
          onChange={handleDueDateChange}
        />
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
git add "src/app/(manager)/manager/tickets/"
git commit -m "feat: add manager ticket detail page with status/priority/assignment controls"
```

---

### Task 14: Update .env.example and final verification

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Verify full build**

```bash
npx next build
```

Expected routes include:
- `/owner/tickets` (dynamic)
- `/owner/tickets/[id]` (dynamic)
- `/manager/tickets` (dynamic)
- `/manager/tickets/[id]` (dynamic)
- `/api/r2/presign` (dynamic)

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Commit and push**

```bash
git push origin main
```
