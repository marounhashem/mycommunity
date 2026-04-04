# Request & Complaint Management Module Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Build the ticket/request management system for MyCommunity. Owners submit maintenance requests with photo uploads, track status, and rate satisfaction. Managers triage tickets on a kanban board, assign staff, set SLAs, and communicate via public/internal comments. Email notifications sent on status changes via Resend.

## Owner Views

### Ticket List (`/owner/tickets`)

- Status filter tabs: All | Open | In Progress | Resolved
- Tickets displayed as cards: title (category + unit), priority badge, status badge, created date
- "New Request" button top-right opens a dialog modal
- Sorted newest first
- Only shows tickets belonging to the owner's unit(s)

### New Ticket Form (dialog modal)

- **Category** dropdown: Maintenance, Cleaning, Security, Landscaping, Other (UI-enforced, stored as String)
- **Priority** select: Low, Medium, High, Urgent
- **Description** textarea (required)
- **Photo upload**: up to 3 images, uploaded to Cloudflare R2 via presigned URLs
- Submit creates ticket in OPEN status + TicketAttachment records

### Ticket Detail (`/owner/tickets/[id]`)

- Header: category, status badge, priority badge, created date
- Photo gallery if attachments exist
- Comment thread: only shows comments where `isInternal === false`
- Owner can add new comments (always public)
- If status is CLOSED and `satisfactionScore` is null: inline star rating widget (1-5) appears at top
- Read-only for status, priority, assignment fields

## Manager Views

### Kanban Board (`/manager/tickets`)

- 4 columns: Open, In Progress, Resolved, Closed
- Column headers show ticket count badge
- Drag-and-drop between columns changes ticket status (triggers server action + email notification)
- Filter bar above board: category dropdown, priority dropdown, assignee dropdown
- Ticket cards show: title, unit number, category, priority badge, assigned avatar or "Unassigned", due date if set
- High and Urgent priority tickets get a crimson left border on the card

### Ticket Detail (`/manager/tickets/[id]`)

- Same header as owner view but with editable controls:
  - Status dropdown (change triggers email notification to owner)
  - Priority dropdown
  - Assign to dropdown (lists users with MANAGER role)
  - SLA due date picker
- Full comment thread including internal comments (displayed with sage/muted background)
- Comment form with "Internal note" checkbox toggle
- Photo gallery for attachments
- Satisfaction score displayed if rated (read-only for manager)

## Email Notifications

- **Trigger:** Whenever ticket status changes (via server action)
- **Recipient:** Ticket owner's email (ticket → unit → owner → user.email)
- **Template:** Branded Terra State style matching existing magic link email (logo, crimson button)
- **Content:** "Your request [category - unit] has been updated to [new status]" with link to ticket detail
- **Scope:** Only sent to owners, not managers/assignees

## File Upload (Cloudflare R2)

### Upload Flow

1. Client calls `POST /api/r2/presign` with `{ filename, contentType }`
2. Server validates session, generates presigned PUT URL via `@aws-sdk/client-s3`
3. Client uploads file directly to R2 using presigned URL
4. On ticket submit, client sends R2 keys with form data
5. Server action creates TicketAttachment records with R2 keys
6. Display: images served via `R2_PUBLIC_URL/{r2Key}`

### R2 Key Format

`tickets/{ticketId}/{uuid}-{filename}`

### Environment Variables (already on Railway)

```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

## Satisfaction Survey

- Inline widget on ticket detail page when status is CLOSED and `satisfactionScore` is null
- 1-5 star rating, clickable
- On submit, calls server action to update `ticket.satisfactionScore`
- After rating, widget shows the selected score as read-only
- No email — owner sees it when checking the "closed" status notification

## Data Layer

### Server Actions (`src/lib/tickets/actions.ts`)

- `createTicket(data)` — validates OWNER session, creates ticket + attachments
- `updateTicketStatus(ticketId, status)` — validates MANAGER/ADMIN session, updates status, sends email
- `assignTicket(ticketId, userId)` — validates MANAGER/ADMIN session
- `updateTicketPriority(ticketId, priority)` — validates MANAGER/ADMIN session
- `setTicketDueDate(ticketId, dueDate)` — validates MANAGER/ADMIN session
- `addComment(ticketId, body, isInternal)` — validates session, OWNER can only add public comments
- `rateTicket(ticketId, score)` — validates OWNER session, ticket must be CLOSED

### Queries (`src/lib/tickets/queries.ts`)

- `getTicketsByUnit(unitId)` — returns tickets for a specific unit with comments/attachments
- `getAllTickets(filters?)` — returns all tickets with optional status/category/priority/assignee filters
- `getTicketById(id)` — returns single ticket with all relations (comments, attachments, unit, assignee)

## New Dependencies

### npm packages
- `@aws-sdk/client-s3` — S3-compatible client for R2
- `@aws-sdk/s3-request-presigner` — presigned URL generation
- `@hello-pangea/dnd` — drag-and-drop for kanban

### shadcn/ui components
- `select`, `textarea`, `dialog`, `dropdown-menu`, `tooltip`

## New Files

| File | Purpose |
|---|---|
| `src/lib/r2.ts` | R2 S3-compatible client setup |
| `src/lib/tickets/actions.ts` | Server actions for all ticket mutations |
| `src/lib/tickets/queries.ts` | Database queries for ticket reads |
| `src/lib/tickets/email.ts` | Ticket status change email via Resend |
| `src/app/api/r2/presign/route.ts` | Presigned URL endpoint for file uploads |
| `src/app/(owner)/owner/tickets/page.tsx` | Owner ticket list + new ticket dialog |
| `src/app/(owner)/owner/tickets/[id]/page.tsx` | Owner ticket detail + comments + rating |
| `src/app/(manager)/manager/tickets/page.tsx` | Manager kanban board with filters |
| `src/app/(manager)/manager/tickets/[id]/page.tsx` | Manager ticket detail with edit controls |
| `src/components/tickets/ticket-card.tsx` | Shared ticket card (used in list + kanban) |
| `src/components/tickets/comment-thread.tsx` | Comment list + add comment form |
| `src/components/tickets/star-rating.tsx` | 1-5 star satisfaction rating widget |
| `src/components/tickets/photo-upload.tsx` | Multi-file upload with R2 presign flow |
| `src/components/tickets/kanban-board.tsx` | Drag-and-drop kanban columns |
| `src/components/tickets/ticket-filters.tsx` | Category/priority/assignee filter bar |

## Prisma Schema

No schema changes required. Existing models support all features:

- `Ticket` — category (String), priority (enum), status (enum), assignedTo, dueDate, satisfactionScore
- `TicketComment` — body, isInternal flag, authorId
- `TicketAttachment` — r2Key, filename
