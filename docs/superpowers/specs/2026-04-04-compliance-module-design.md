# Approval & Compliance Module Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Build the renovation approval workflow and violation management system. Owners submit multi-step renovation applications with document uploads, track approval status. Managers review and approve/reject applications. Managers issue violations with fines. Owners view violations with a stubbed payment flow. All compliance actions logged to an audit table.

## Schema Changes

### New Enum: RenovationStatus

```prisma
enum RenovationStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  CHANGES_REQUESTED
}
```

### New Enum: ViolationStatus

```prisma
enum ViolationStatus {
  OPEN
  PAID
  RESOLVED
}
```

### Expand RenovationApplication Model

Replace existing model with:

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

### New Model: RenovationAttachment

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

### Expand Violation Model

Replace existing model with:

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

Note: User model needs new relation `issuedViolations Violation[] @relation("IssuedViolations")`.

### New Model: AuditLog

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

Note: User model needs new relation `auditLogs AuditLog[]`.

## Audit Logging

Utility function `logAudit(action, entityType, entityId, userId, metadata?)` called from server actions.

Actions logged:
- `RENOVATION_SUBMITTED` — owner submits application
- `RENOVATION_APPROVED` — manager approves
- `RENOVATION_REJECTED` — manager rejects
- `RENOVATION_CHANGES_REQUESTED` — manager requests changes
- `VIOLATION_CREATED` — manager issues violation
- `VIOLATION_RESOLVED` — manager marks resolved

## Owner Renovation Form (`/owner/renovations/new`)

Multi-step wizard (4 steps):

**Step 1 — Scope:**
- Project scope (Select: Interior Renovation, Exterior Modification, Plumbing, Electrical, Structural, Other)
- Description textarea (required)

**Step 2 — Dates & Contractor:**
- Start date (date picker, required)
- End date (date picker, optional)
- Contractor name (text input, optional)

**Step 3 — Documents:**
- Upload floor plans/drawings to R2 (reuse presign with `renovations` prefix, max 5 files)
- Shows uploaded filenames with remove buttons

**Step 4 — Review & Submit:**
- Summary card showing all entered data
- Submit button → creates RenovationApplication + attachments + AuditLog
- Redirect to `/owner/renovations`

## Owner Renovation List (`/owner/renovations`)

- List of owner's renovation applications ordered by createdAt desc
- Each card: scope, status badge, submitted date, contractor name
- "New Application" button top-right
- Click to view detail page

## Owner Renovation Detail (`/owner/renovations/[id]`)

- Full application details
- Status tracker: visual stepper (Submitted → Under Review → Approved/Rejected)
- If CHANGES_REQUESTED: show manager comment in a highlighted card
- Document gallery (links to R2 files)
- Read-only — owner cannot edit after submission

## Manager Approval Queue (`/manager/renovations`)

- Table of all renovation applications
- Status filter tabs: All | Pending | Under Review | Approved | Rejected
- Columns: unit number, scope, submitted date, status badge
- Click row to view detail

## Manager Renovation Detail (`/manager/renovations/[id]`)

- Full application details + uploaded documents
- Action panel with:
  - Status dropdown (can move to UNDER_REVIEW, APPROVED, REJECTED, CHANGES_REQUESTED)
  - Comment textarea (required for Reject and Changes Requested)
  - Save button
- Status change creates AuditLog entry

## Manager Create Violation (`/manager/violations/new`)

- Unit selector dropdown (all units with unit number + zone)
- Rule breached dropdown:
  - Noise After Hours
  - Unauthorized Modifications
  - Pet Policy Violation
  - Parking Violation
  - Common Area Misuse
  - Waste Disposal Violation
  - Other
- Description textarea
- Photo evidence upload to R2 (single file, presign with `violations` prefix)
- Fine amount in AED (number input)
- Submit creates Violation + AuditLog entry
- Redirect to `/manager/violations`

## Manager Violations List (`/manager/violations`)

- Table of all violations ordered by createdAt desc
- Columns: unit number, rule, fine (AED), status badge, date
- Manager can mark as "Resolved" from the list (button per row)

## Owner Violations View (`/owner/violations`)

- List of violations for owner's unit(s)
- Each card: rule breached, date, fine amount, status badge, evidence photo thumbnail
- "Pay Fine" button links to existing `/owner/payment-pending` page (stub)
- No edit capability

## Nav Link Changes

Add to `ownerLinks` (after "My Tickets"):
- `{ label: "Renovations", href: "/renovations", icon: HardHat }`
- `{ label: "Violations", href: "/violations", icon: AlertTriangle }`

## Presign Endpoint Changes

Add `renovations` and `violations` to ALLOWED_PREFIXES in `src/app/api/r2/presign/route.ts`.

## New Files

| File | Purpose |
|---|---|
| `src/lib/audit.ts` | logAudit utility function |
| `src/lib/renovations/actions.ts` | Server actions: submitRenovation, updateRenovationStatus |
| `src/lib/renovations/queries.ts` | getRenovationsByUnit, getAllRenovations, getRenovationById |
| `src/lib/violations/actions.ts` | Server actions: createViolation, resolveViolation |
| `src/lib/violations/queries.ts` | getViolationsByUnit, getAllViolations |
| `src/components/renovations/status-tracker.tsx` | Visual stepper component |
| `src/components/renovations/multi-step-form.tsx` | 4-step wizard client component |
| `src/app/(owner)/owner/renovations/page.tsx` | Owner renovation list |
| `src/app/(owner)/owner/renovations/new/page.tsx` | Multi-step form page |
| `src/app/(owner)/owner/renovations/[id]/page.tsx` | Detail + status tracker |
| `src/app/(owner)/owner/violations/page.tsx` | Owner violations list |
| `src/app/(manager)/manager/renovations/page.tsx` | Approval queue |
| `src/app/(manager)/manager/renovations/[id]/page.tsx` | Review + approve/reject |
| `src/app/(manager)/manager/violations/page.tsx` | Violations list |
| `src/app/(manager)/manager/violations/new/page.tsx` | Create violation form |

## Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add enums, expand models, add AuditLog + RenovationAttachment |
| `src/app/api/r2/presign/route.ts` | Add renovations, violations to ALLOWED_PREFIXES |
| `src/lib/nav-links.ts` | Add Renovations + Violations to ownerLinks |

## Dependencies

No new npm packages. Reuses existing R2 client, shadcn/ui components, presign endpoint.
