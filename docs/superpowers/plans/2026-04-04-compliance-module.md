# Compliance Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build renovation approval workflow (multi-step form, status tracker, manager queue) and violation management (creation, owner view, stubbed payment) with audit logging.

**Architecture:** Server Actions for mutations with audit logging. Multi-step wizard as a client component with local state. Status tracker as a reusable visual stepper. Presign endpoint extended for renovations/violations prefixes.

**Tech Stack:** Next.js 14, Prisma 7, shadcn/ui, R2 (existing)

**Spec:** `docs/superpowers/specs/2026-04-04-compliance-module-design.md`

---

### Task 1: Schema — Add enums, expand models, add AuditLog + RenovationAttachment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add RenovationStatus and ViolationStatus enums**

In `prisma/schema.prisma`, after the existing `Audience` enum (around line 44), add:

```prisma
enum RenovationStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  CHANGES_REQUESTED
}

enum ViolationStatus {
  OPEN
  PAID
  RESOLVED
}
```

- [ ] **Step 2: Add issuedViolations and auditLogs relations to User model**

In the User model (around line 63), after the `notifications` line, add:

```prisma
  issuedViolations Violation[]       @relation("IssuedViolations")
  auditLogs       AuditLog[]
```

- [ ] **Step 3: Replace RenovationApplication model**

Replace the entire RenovationApplication model (lines 187-200) with:

```prisma
model RenovationApplication {
  id             String            @id @default(cuid())
  unitId         String            @map("unit_id")
  scope          String
  description    String            @default("")
  contractorName String?           @map("contractor_name")
  startDate      DateTime          @map("start_date")
  endDate        DateTime?         @map("end_date")
  status         RenovationStatus  @default(PENDING)
  managerComment String?           @map("manager_comment")
  approvedBy     String?           @map("approved_by")
  approvedAt     DateTime?         @map("approved_at")
  createdAt      DateTime          @default(now()) @map("created_at")

  unit        Unit                    @relation(fields: [unitId], references: [id])
  approver    User?                   @relation("ApprovedRenovations", fields: [approvedBy], references: [id])
  attachments RenovationAttachment[]

  @@map("renovation_applications")
}
```

- [ ] **Step 4: Add RenovationAttachment model**

Add after RenovationApplication:

```prisma
model RenovationAttachment {
  id           String @id @default(cuid())
  renovationId String @map("renovation_id")
  r2Key        String @map("r2_key")
  filename     String

  renovation RenovationApplication @relation(fields: [renovationId], references: [id])

  @@map("renovation_attachments")
}
```

- [ ] **Step 5: Replace Violation model**

Replace the entire Violation model (lines 202-214) with:

```prisma
model Violation {
  id            String          @id @default(cuid())
  unitId        String          @map("unit_id")
  issuedById    String          @map("issued_by")
  ruleBreached  String          @map("rule_breached")
  description   String?
  evidenceR2Key String?         @map("evidence_r2_key")
  evidenceName  String?         @map("evidence_name")
  fineAmountAed Decimal?        @map("fine_amount_aed") @db.Decimal(10, 2)
  status        ViolationStatus @default(OPEN)
  resolvedAt    DateTime?       @map("resolved_at")
  createdAt     DateTime        @default(now()) @map("created_at")

  unit     Unit @relation(fields: [unitId], references: [id])
  issuedBy User @relation("IssuedViolations", fields: [issuedById], references: [id])

  @@map("violations")
}
```

- [ ] **Step 6: Add AuditLog model**

Add after Violation (before VerificationToken):

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  action     String
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  userId     String   @map("user_id")
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}
```

- [ ] **Step 7: Run migration**

```bash
npx prisma migrate dev --name add-compliance-models
```

- [ ] **Step 8: Regenerate client and verify build**

```bash
npx prisma generate && npx next build
```

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add compliance schema — RenovationStatus, ViolationStatus enums, AuditLog, RenovationAttachment, expanded models"
```

---

### Task 2: Presign prefix update + audit utility + nav links

**Files:**
- Modify: `src/app/api/r2/presign/route.ts:9`
- Create: `src/lib/audit.ts`
- Modify: `src/lib/nav-links.ts`

- [ ] **Step 1: Add renovations and violations to presign ALLOWED_PREFIXES**

In `src/app/api/r2/presign/route.ts`, change line 9 from:

```typescript
const ALLOWED_PREFIXES = ["tickets/pending", "announcements"];
```

to:

```typescript
const ALLOWED_PREFIXES = ["tickets/pending", "announcements", "renovations", "violations"];
```

- [ ] **Step 2: Create audit utility**

Create `src/lib/audit.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      userId,
      metadata: metadata ?? undefined,
    },
  });
}
```

- [ ] **Step 3: Add Renovations and Violations to ownerLinks**

In `src/lib/nav-links.ts`, in the `ownerLinks` array, add after the "My Tickets" entry:

```typescript
  { label: "Renovations", href: "/renovations", icon: HardHat },
  { label: "Violations", href: "/violations", icon: AlertTriangle },
```

- [ ] **Step 4: Verify build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/r2/presign/route.ts src/lib/audit.ts src/lib/nav-links.ts
git commit -m "feat: add audit utility, presign prefixes, and owner nav links for compliance"
```

---

### Task 3: Renovation queries and actions

**Files:**
- Create: `src/lib/renovations/queries.ts`
- Create: `src/lib/renovations/actions.ts`

- [ ] **Step 1: Create renovation queries**

Create `src/lib/renovations/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function getRenovationsByUnit(unitIds: string[]) {
  return prisma.renovationApplication.findMany({
    where: { unitId: { in: unitIds } },
    include: { unit: true, approver: true, attachments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllRenovations(statusFilter?: string) {
  const where = statusFilter ? { status: statusFilter as any } : {};
  return prisma.renovationApplication.findMany({
    where,
    include: { unit: true, approver: true, attachments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRenovationById(id: string) {
  return prisma.renovationApplication.findUnique({
    where: { id },
    include: { unit: true, approver: true, attachments: true },
  });
}
```

- [ ] **Step 2: Create renovation actions**

Create `src/lib/renovations/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function submitRenovation(data: {
  unitId: string;
  scope: string;
  description: string;
  contractorName?: string;
  startDate: string;
  endDate?: string;
  attachmentKeys: { key: string; filename: string }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const renovation = await prisma.renovationApplication.create({
    data: {
      unitId: data.unitId,
      scope: data.scope,
      description: data.description,
      contractorName: data.contractorName || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      attachments: {
        create: data.attachmentKeys.map((a) => ({
          r2Key: a.key,
          filename: a.filename,
        })),
      },
    },
  });

  await logAudit("RENOVATION_SUBMITTED", "RenovationApplication", renovation.id, session.user.id);

  revalidatePath("/owner/renovations");
  revalidatePath("/manager/renovations");
  return renovation.id;
}

export async function updateRenovationStatus(
  renovationId: string,
  status: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
  comment?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const data: Record<string, unknown> = {
    status,
    managerComment: comment || null,
  };

  if (status === "APPROVED") {
    data.approvedBy = session.user.id;
    data.approvedAt = new Date();
  }

  await prisma.renovationApplication.update({
    where: { id: renovationId },
    data,
  });

  const actionMap: Record<string, string> = {
    UNDER_REVIEW: "RENOVATION_UNDER_REVIEW",
    APPROVED: "RENOVATION_APPROVED",
    REJECTED: "RENOVATION_REJECTED",
    CHANGES_REQUESTED: "RENOVATION_CHANGES_REQUESTED",
  };

  await logAudit(
    actionMap[status],
    "RenovationApplication",
    renovationId,
    session.user.id,
    comment ? { comment } : undefined
  );

  revalidatePath("/owner/renovations");
  revalidatePath("/manager/renovations");
  revalidatePath(`/owner/renovations/${renovationId}`);
  revalidatePath(`/manager/renovations/${renovationId}`);
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/renovations/
git commit -m "feat: add renovation queries and server actions with audit logging"
```

---

### Task 4: Violation queries and actions

**Files:**
- Create: `src/lib/violations/queries.ts`
- Create: `src/lib/violations/actions.ts`

- [ ] **Step 1: Create violation queries**

Create `src/lib/violations/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function getViolationsByUnit(unitIds: string[]) {
  return prisma.violation.findMany({
    where: { unitId: { in: unitIds } },
    include: { unit: true, issuedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllViolations() {
  return prisma.violation.findMany({
    include: { unit: true, issuedBy: true },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 2: Create violation actions**

Create `src/lib/violations/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function createViolation(data: {
  unitId: string;
  ruleBreached: string;
  description?: string;
  evidenceR2Key?: string;
  evidenceName?: string;
  fineAmountAed?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const violation = await prisma.violation.create({
    data: {
      unitId: data.unitId,
      issuedById: session.user.id,
      ruleBreached: data.ruleBreached,
      description: data.description || null,
      evidenceR2Key: data.evidenceR2Key || null,
      evidenceName: data.evidenceName || null,
      fineAmountAed: data.fineAmountAed ?? null,
    },
  });

  await logAudit("VIOLATION_CREATED", "Violation", violation.id, session.user.id, {
    unitId: data.unitId,
    rule: data.ruleBreached,
    fineAed: data.fineAmountAed,
  });

  revalidatePath("/owner/violations");
  revalidatePath("/manager/violations");
  return violation.id;
}

export async function resolveViolation(violationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await prisma.violation.update({
    where: { id: violationId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await logAudit("VIOLATION_RESOLVED", "Violation", violationId, session.user.id);

  revalidatePath("/owner/violations");
  revalidatePath("/manager/violations");
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/violations/
git commit -m "feat: add violation queries and server actions with audit logging"
```

---

### Task 5: Status tracker and multi-step form components

**Files:**
- Create: `src/components/renovations/status-tracker.tsx`
- Create: `src/components/renovations/multi-step-form.tsx`

- [ ] **Step 1: Create status tracker component**

Create `src/components/renovations/status-tracker.tsx`:

```tsx
import { Check, Clock, XCircle, AlertTriangle } from "lucide-react";

interface StatusTrackerProps {
  status: string;
}

const steps = [
  { key: "PENDING", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "FINAL", label: "Decision" },
];

export function StatusTracker({ status }: StatusTrackerProps) {
  const isFinal = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"].includes(status);
  const currentIndex = status === "PENDING" ? 0
    : status === "UNDER_REVIEW" ? 1
    : isFinal ? 2 : 0;

  function getStepIcon(index: number) {
    if (index < currentIndex) return <Check className="h-4 w-4 text-white" />;
    if (index === currentIndex && isFinal) {
      if (status === "APPROVED") return <Check className="h-4 w-4 text-white" />;
      if (status === "REJECTED") return <XCircle className="h-4 w-4 text-white" />;
      if (status === "CHANGES_REQUESTED") return <AlertTriangle className="h-4 w-4 text-white" />;
    }
    if (index === currentIndex) return <Clock className="h-4 w-4 text-white" />;
    return <span className="text-xs text-muted-foreground">{index + 1}</span>;
  }

  function getStepColor(index: number) {
    if (index < currentIndex) return "bg-teal";
    if (index === currentIndex) {
      if (status === "APPROVED") return "bg-teal";
      if (status === "REJECTED") return "bg-crimson";
      if (status === "CHANGES_REQUESTED") return "bg-gold";
      return "bg-gold";
    }
    return "bg-cream-300";
  }

  function getLabel(index: number) {
    if (index === 2 && isFinal) {
      if (status === "APPROVED") return "Approved";
      if (status === "REJECTED") return "Rejected";
      if (status === "CHANGES_REQUESTED") return "Changes Requested";
    }
    return steps[index].label;
  }

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getStepColor(index)}`}>
              {getStepIcon(index)}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {getLabel(index)}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-0.5 w-12 ${index < currentIndex ? "bg-teal" : "bg-cream-300"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create multi-step form component**

Create `src/components/renovations/multi-step-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload } from "@/components/tickets/photo-upload";
import { submitRenovation } from "@/lib/renovations/actions";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

const SCOPES = [
  "Interior Renovation",
  "Exterior Modification",
  "Plumbing",
  "Electrical",
  "Structural",
  "Other",
];

interface MultiStepFormProps {
  unitIds: string[];
}

export function MultiStepForm({ unitIds }: MultiStepFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [attachments, setAttachments] = useState<{ key: string; filename: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canNext = () => {
    if (step === 1) return scope && description.trim();
    if (step === 2) return startDate;
    return true;
  };

  async function handleSubmit() {
    if (unitIds.length === 0) {
      setError("No unit associated with your account");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitRenovation({
        unitId: unitIds[0],
        scope,
        description: description.trim(),
        contractorName: contractorName.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        attachmentKeys: attachments,
      });
      router.push("/owner/renovations");
    } catch {
      setError("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              s <= step ? "bg-crimson text-white" : "bg-cream-300 text-muted-foreground"
            }`}>
              {s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${s < step ? "bg-crimson" : "bg-cream-300"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">{error}</div>
      )}

      {/* Step 1: Scope */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Describe the renovation work..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
          </div>
        </div>
      )}

      {/* Step 2: Dates & Contractor */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End Date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contractor Name (optional)</Label>
            <Input placeholder="Contractor or company name" value={contractorName} onChange={(e) => setContractorName(e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 3: Documents */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Floor Plans / Drawings (max 5 files)</Label>
            <PhotoUpload maxFiles={5} onFilesChange={setAttachments} />
          </div>
          <p className="text-xs text-muted-foreground">Upload floor plans, architectural drawings, or photos of the area.</p>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="font-heading text-lg font-semibold">Review Your Application</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Scope:</span>
              <span className="text-foreground">{scope}</span>
              <span className="text-muted-foreground">Description:</span>
              <span className="text-foreground">{description}</span>
              <span className="text-muted-foreground">Start Date:</span>
              <span className="text-foreground">{startDate}</span>
              {endDate && (<><span className="text-muted-foreground">End Date:</span><span className="text-foreground">{endDate}</span></>)}
              {contractorName && (<><span className="text-muted-foreground">Contractor:</span><span className="text-foreground">{contractorName}</span></>)}
              <span className="text-muted-foreground">Documents:</span>
              <span className="text-foreground">{attachments.length} file(s)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="h-4 w-4 mr-1" /> {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        )}
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
git add src/components/renovations/
git commit -m "feat: add StatusTracker and MultiStepForm components for renovations"
```

---

### Task 6: Owner renovation pages

**Files:**
- Create: `src/app/(owner)/owner/renovations/page.tsx`
- Create: `src/app/(owner)/owner/renovations/new/page.tsx`
- Create: `src/app/(owner)/owner/renovations/[id]/page.tsx`

- [ ] **Step 1: Create owner renovation list page**

Create `src/app/(owner)/owner/renovations/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRenovationsByUnit } from "@/lib/renovations/queries";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Plus } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-gold-100 text-gold-700",
  UNDER_REVIEW: "bg-gold-100 text-gold-700",
  APPROVED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-crimson-100 text-crimson-700",
  CHANGES_REQUESTED: "bg-gold-100 text-gold-700",
};

export default async function OwnerRenovationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const renovations = await getRenovationsByUnit(unitIds);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Renovations</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and track renovation applications</p>
        </div>
        <Button asChild>
          <Link href="/owner/renovations/new"><Plus className="h-4 w-4 mr-1" /> New Application</Link>
        </Button>
      </div>

      {renovations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No renovation applications yet.</p>
      ) : (
        <div className="space-y-3">
          {renovations.map((r) => (
            <Link key={r.id} href={`/owner/renovations/${r.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{r.scope}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.description.slice(0, 100)}{r.description.length > 100 ? "..." : ""}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[r.status] || ""}>{r.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Unit {r.unit.unitNumber}</span>
                    {r.contractorName && <span>Contractor: {r.contractorName}</span>}
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create new renovation page**

Create `src/app/(owner)/owner/renovations/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { MultiStepForm } from "@/components/renovations/multi-step-form";

export default async function NewRenovationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-bold text-foreground">New Renovation Application</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Submit your renovation request for approval</p>
      <MultiStepForm unitIds={unitIds} />
    </div>
  );
}
```

- [ ] **Step 3: Create renovation detail page**

Create `src/app/(owner)/owner/renovations/[id]/page.tsx`:

```tsx
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRenovationById } from "@/lib/renovations/queries";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { StatusTracker } from "@/components/renovations/status-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function OwnerRenovationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const renovation = await getRenovationById(params.id);
  if (!renovation || !unitIds.includes(renovation.unitId)) notFound();

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-2xl">
      <Link href="/owner/renovations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to renovations
      </Link>

      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{renovation.scope}</h1>

      <div className="mb-6">
        <StatusTracker status={renovation.status} />
      </div>

      {renovation.status === "CHANGES_REQUESTED" && renovation.managerComment && (
        <Card className="mb-6 border-gold-300 bg-gold-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gold-700">Changes Requested</p>
            <p className="text-sm text-foreground mt-1">{renovation.managerComment}</p>
          </CardContent>
        </Card>
      )}

      {renovation.status === "REJECTED" && renovation.managerComment && (
        <Card className="mb-6 border-crimson-300 bg-crimson-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-crimson-700">Rejection Reason</p>
            <p className="text-sm text-foreground mt-1">{renovation.managerComment}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 text-sm mb-6">
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Unit:</span>
          <span>{renovation.unit.unitNumber}</span>
          <span className="text-muted-foreground">Description:</span>
          <span>{renovation.description}</span>
          <span className="text-muted-foreground">Start Date:</span>
          <span>{new Date(renovation.startDate).toLocaleDateString()}</span>
          {renovation.endDate && (<><span className="text-muted-foreground">End Date:</span><span>{new Date(renovation.endDate).toLocaleDateString()}</span></>)}
          {renovation.contractorName && (<><span className="text-muted-foreground">Contractor:</span><span>{renovation.contractorName}</span></>)}
          <span className="text-muted-foreground">Submitted:</span>
          <span>{new Date(renovation.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {renovation.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading text-lg font-semibold mb-2">Documents</h3>
          <div className="space-y-1">
            {renovation.attachments.map((att) => (
              <a key={att.id} href={`${publicUrl}/${att.r2Key}`} target="_blank" rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline">{att.filename}</a>
            ))}
          </div>
        </div>
      )}
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
git add "src/app/(owner)/owner/renovations/"
git commit -m "feat: add owner renovation list, multi-step form, and detail with status tracker"
```

---

### Task 7: Manager renovation pages

**Files:**
- Create: `src/app/(manager)/manager/renovations/page.tsx`
- Create: `src/app/(manager)/manager/renovations/[id]/page.tsx`
- Create: `src/app/(manager)/manager/renovations/[id]/approval-controls.tsx`

- [ ] **Step 1: Create manager renovation list page**

Create `src/app/(manager)/manager/renovations/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllRenovations } from "@/lib/renovations/queries";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const statusColors: Record<string, string> = {
  PENDING: "bg-gold-100 text-gold-700",
  UNDER_REVIEW: "bg-gold-100 text-gold-700",
  APPROVED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-crimson-100 text-crimson-700",
  CHANGES_REQUESTED: "bg-gold-100 text-gold-700",
};

export default async function ManagerRenovationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const renovations = await getAllRenovations(searchParams.status);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Renovation Approvals</h1>
      <p className="text-sm text-muted-foreground mb-6">Review and approve renovation applications</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((s) => (
          <Link key={s} href={s === "ALL" ? "/manager/renovations" : `/manager/renovations?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              (searchParams.status || "ALL") === s ? "bg-crimson text-white border-crimson" : "bg-card border-border text-foreground"
            }`}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {renovations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No applications found.</p>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 px-4 py-3 bg-muted/30 text-xs font-semibold">
            <span>Unit</span><span>Scope</span><span>Submitted</span><span>Status</span>
          </div>
          {renovations.map((r) => (
            <Link key={r.id} href={`/manager/renovations/${r.id}`} className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 px-4 py-3 border-t border-border text-sm hover:bg-muted/10">
              <span className="font-medium">{r.unit.unitNumber}</span>
              <span className="truncate text-muted-foreground">{r.scope} — {r.description.slice(0, 50)}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
              <Badge variant="outline" className={`w-fit text-[10px] ${statusColors[r.status]}`}>{r.status.replace("_", " ")}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create approval controls client component**

Create `src/app/(manager)/manager/renovations/[id]/approval-controls.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateRenovationStatus } from "@/lib/renovations/actions";
import { Check, X, MessageSquare, Eye } from "lucide-react";

interface ApprovalControlsProps {
  renovationId: string;
  currentStatus: string;
}

export function ApprovalControls({ renovationId, currentStatus }: ApprovalControlsProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState("");

  async function handleAction(status: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    if ((status === "REJECTED" || status === "CHANGES_REQUESTED") && !comment.trim()) {
      alert("Please provide a comment for this action.");
      return;
    }
    setLoading(status);
    try {
      await updateRenovationStatus(renovationId, status, comment.trim() || undefined);
      router.refresh();
    } finally {
      setLoading("");
    }
  }

  if (currentStatus === "APPROVED" || currentStatus === "REJECTED") {
    return null;
  }

  return (
    <div className="rounded-lg border border-border p-4 bg-card mb-6 space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Comment (required for Reject / Request Changes)</Label>
        <Textarea placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-wrap gap-2">
        {currentStatus === "PENDING" && (
          <Button size="sm" variant="outline" onClick={() => handleAction("UNDER_REVIEW")} disabled={!!loading}>
            <Eye className="h-4 w-4 mr-1" /> {loading === "UNDER_REVIEW" ? "..." : "Mark Under Review"}
          </Button>
        )}
        <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => handleAction("APPROVED")} disabled={!!loading}>
          <Check className="h-4 w-4 mr-1" /> {loading === "APPROVED" ? "..." : "Approve"}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleAction("REJECTED")} disabled={!!loading}>
          <X className="h-4 w-4 mr-1" /> {loading === "REJECTED" ? "..." : "Reject"}
        </Button>
        <Button size="sm" variant="outline" className="border-gold text-gold-700" onClick={() => handleAction("CHANGES_REQUESTED")} disabled={!!loading}>
          <MessageSquare className="h-4 w-4 mr-1" /> {loading === "CHANGES_REQUESTED" ? "..." : "Request Changes"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create manager renovation detail page**

Create `src/app/(manager)/manager/renovations/[id]/page.tsx`:

```tsx
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRenovationById } from "@/lib/renovations/queries";
import { StatusTracker } from "@/components/renovations/status-tracker";
import { ApprovalControls } from "./approval-controls";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ManagerRenovationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const renovation = await getRenovationById(params.id);
  if (!renovation) notFound();

  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div className="max-w-2xl">
      <Link href="/manager/renovations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to approvals
      </Link>

      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{renovation.scope} — Unit {renovation.unit.unitNumber}</h1>

      <div className="mb-6"><StatusTracker status={renovation.status} /></div>

      <ApprovalControls renovationId={renovation.id} currentStatus={renovation.status} />

      {renovation.managerComment && (
        <div className="mb-6 rounded-md bg-muted p-3 text-sm">
          <span className="font-medium">Manager Comment:</span> {renovation.managerComment}
        </div>
      )}

      <div className="space-y-3 text-sm mb-6">
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Description:</span><span>{renovation.description}</span>
          <span className="text-muted-foreground">Start Date:</span><span>{new Date(renovation.startDate).toLocaleDateString()}</span>
          {renovation.endDate && (<><span className="text-muted-foreground">End Date:</span><span>{new Date(renovation.endDate).toLocaleDateString()}</span></>)}
          {renovation.contractorName && (<><span className="text-muted-foreground">Contractor:</span><span>{renovation.contractorName}</span></>)}
          <span className="text-muted-foreground">Submitted:</span><span>{new Date(renovation.createdAt).toLocaleDateString()}</span>
          {renovation.approver && (<><span className="text-muted-foreground">Reviewed by:</span><span>{renovation.approver.email}</span></>)}
        </div>
      </div>

      {renovation.attachments.length > 0 && (
        <div>
          <h3 className="font-heading text-lg font-semibold mb-2">Documents</h3>
          <div className="space-y-1">
            {renovation.attachments.map((att) => (
              <a key={att.id} href={`${publicUrl}/${att.r2Key}`} target="_blank" rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline">{att.filename}</a>
            ))}
          </div>
        </div>
      )}
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
git add "src/app/(manager)/manager/renovations/"
git commit -m "feat: add manager renovation approval queue and detail page"
```

---

### Task 8: Manager violations pages

**Files:**
- Create: `src/app/(manager)/manager/violations/page.tsx`
- Create: `src/app/(manager)/manager/violations/new/page.tsx`
- Create: `src/app/(manager)/manager/violations/new/violation-form.tsx`

- [ ] **Step 1: Create manager violations list page**

Create `src/app/(manager)/manager/violations/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllViolations } from "@/lib/violations/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveViolation } from "@/lib/violations/actions";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ResolveButton } from "./resolve-button";

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  PAID: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
};

export default async function ManagerViolationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const violations = await getAllViolations();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Violations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage community rule violations</p>
        </div>
        <Button asChild>
          <Link href="/manager/violations/new"><Plus className="h-4 w-4 mr-1" /> Issue Violation</Link>
        </Button>
      </div>

      {violations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No violations issued.</p>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_80px_1fr_80px] gap-4 px-4 py-3 bg-muted/30 text-xs font-semibold">
            <span>Unit</span><span>Rule</span><span>Fine</span><span>Date</span><span>Status</span>
          </div>
          {violations.map((v) => (
            <div key={v.id} className="grid grid-cols-[1fr_2fr_80px_1fr_80px] gap-4 px-4 py-3 border-t border-border text-sm items-center">
              <span className="font-medium">{v.unit.unitNumber}</span>
              <span className="truncate text-muted-foreground">{v.ruleBreached}</span>
              <span>{v.fineAmountAed ? `${v.fineAmountAed} AED` : "—"}</span>
              <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={`text-[10px] ${statusColors[v.status]}`}>{v.status}</Badge>
                {v.status === "OPEN" && <ResolveButton violationId={v.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ResolveButton client component**

Create `src/app/(manager)/manager/violations/resolve-button.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { resolveViolation } from "@/lib/violations/actions";
import { Check } from "lucide-react";

export function ResolveButton({ violationId }: { violationId: string }) {
  const router = useRouter();

  async function handleResolve() {
    await resolveViolation(violationId);
    router.refresh();
  }

  return (
    <button onClick={handleResolve} className="text-teal hover:text-teal-600" title="Mark Resolved">
      <Check className="h-4 w-4" />
    </button>
  );
}
```

- [ ] **Step 3: Create violation form client component**

Create `src/app/(manager)/manager/violations/new/violation-form.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createViolation } from "@/lib/violations/actions";
import { Paperclip, X } from "lucide-react";

const RULES = [
  "Noise After Hours",
  "Unauthorized Modifications",
  "Pet Policy Violation",
  "Parking Violation",
  "Common Area Misuse",
  "Waste Disposal Violation",
  "Other",
];

interface ViolationFormProps {
  units: { id: string; unitNumber: string; zone: string }[];
}

export function ViolationForm({ units }: ViolationFormProps) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [rule, setRule] = useState("");
  const [description, setDescription] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [evidence, setEvidence] = useState<{ key: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch("/api/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, prefix: "violations" }),
      });
      const { url, key } = await res.json();
      await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      setEvidence({ key, filename: file.name });
    } catch { setError("Upload failed"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId || !rule) { setError("Unit and rule are required"); return; }
    setSubmitting(true);
    setError("");
    try {
      await createViolation({
        unitId, ruleBreached: rule,
        description: description.trim() || undefined,
        evidenceR2Key: evidence?.key,
        evidenceName: evidence?.filename,
        fineAmountAed: fineAmount ? parseFloat(fineAmount) : undefined,
      });
      router.push("/manager/violations");
    } catch { setError("Failed to create violation"); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      <div className="space-y-2">
        <Label>Unit</Label>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
          <SelectContent>
            {units.map((u) => (<SelectItem key={u.id} value={u.id}>Unit {u.unitNumber} ({u.zone})</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Rule Breached</Label>
        <Select value={rule} onValueChange={setRule}>
          <SelectTrigger><SelectValue placeholder="Select rule" /></SelectTrigger>
          <SelectContent>
            {RULES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea placeholder="Additional details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Photo Evidence (optional)</Label>
        {evidence ? (
          <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="truncate flex-1">{evidence.filename}</span>
            <button type="button" onClick={() => setEvidence(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Paperclip className="h-4 w-4 mr-1" />{uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>
      <div className="space-y-2">
        <Label>Fine Amount (AED)</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Issuing..." : "Issue Violation"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create new violation page**

Create `src/app/(manager)/manager/violations/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllUnits } from "@/lib/comms/queries";
import { ViolationForm } from "./violation-form";

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const units = await getAllUnits();

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-bold text-foreground">Issue Violation</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Record a community rule violation</p>
      <ViolationForm units={units} />
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npx next build
```

- [ ] **Step 6: Commit**

```bash
git add "src/app/(manager)/manager/violations/"
git commit -m "feat: add manager violations list, create form, and resolve action"
```

---

### Task 9: Owner violations page

**Files:**
- Create: `src/app/(owner)/owner/violations/page.tsx`

- [ ] **Step 1: Create owner violations list**

Create `src/app/(owner)/owner/violations/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getViolationsByUnit } from "@/lib/violations/queries";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  PAID: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
};

export default async function OwnerViolationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);
  const violations = await getViolationsByUnit(unitIds);
  const publicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Violations</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Community rule violations for your unit</p>

      {violations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No violations on record.</p>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{v.ruleBreached}</p>
                    {v.description && <p className="text-xs text-muted-foreground mt-1">{v.description}</p>}
                  </div>
                  <Badge variant="outline" className={statusColors[v.status]}>{v.status}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Unit {v.unit.unitNumber}</span>
                  {v.fineAmountAed && <span className="font-medium text-crimson">{String(v.fineAmountAed)} AED</span>}
                  <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
                {v.evidenceR2Key && (
                  <a href={`${publicUrl}/${v.evidenceR2Key}`} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-primary hover:underline">View evidence</a>
                )}
                {v.status === "OPEN" && v.fineAmountAed && (
                  <div className="mt-3">
                    <Button size="sm" asChild>
                      <Link href="/owner/payment-pending">Pay Fine</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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
git add "src/app/(owner)/owner/violations/"
git commit -m "feat: add owner violations view with stubbed Pay Fine button"
```

---

### Task 10: Final verification and push

- [ ] **Step 1: Full build check**

```bash
npx next build
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Push**

```bash
git push origin main
```
