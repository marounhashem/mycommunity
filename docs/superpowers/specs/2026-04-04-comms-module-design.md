# Owner Communication Module Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Build the announcement/communication system for MyCommunity. Managers compose rich-text announcements with audience targeting and file attachments. Owners receive notifications with an unread badge in the nav. Managers can view an archive of all past announcements with delivery statistics.

## Schema Changes

### New Model: NotificationLog

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

### Modify Announcement Model

Add fields:
- `attachmentR2Key String? @map("attachment_r2_key")` — optional file attachment
- `notifications NotificationLog[]` — relation to notification logs

### Modify User Model

Add relation:
- `notifications NotificationLog[]`

## Presign Endpoint Changes

Modify `src/app/api/r2/presign/route.ts`:
- Accept `prefix` param in request body
- Validate prefix is one of: `tickets/pending`, `announcements`
- Default to `tickets/pending` if not provided (backwards compatible)
- Key format: `{prefix}/{uuid}-{filename}`

## Manager Compose Page (`/manager/comms/new`)

### Layout
- Subject line (Input, required)
- Audience selector (Select):
  - "All Owners" — targets all owners
  - "By Zone" — shows zone dropdown (populated from distinct unit zones)
  - "Specific Unit" — shows unit search/select dropdown
- Rich text body (Tiptap editor):
  - Basic formatting: bold, italic, bullet list, ordered list, links
  - Uses `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`
- File attachment (optional, single file):
  - Reuses presign flow with `announcements` prefix
  - Shows filename after upload with remove button
- Preview toggle: button switches between editor and rendered HTML card
- Send button: disabled until subject + body filled

### Send Flow
1. Server action `sendAnnouncement` called with: title, bodyHtml, audience type, zone/unitId, attachmentR2Key
2. Create Announcement record with `sentAt: now()`
3. Query matched owners based on audience:
   - ALL: all users with role OWNER
   - ZONE: owners whose unit.zone matches
   - UNIT: owners whose unitId matches
4. Create NotificationLog row per matched owner
5. Send email to each owner via Resend (branded template with title + body excerpt + "View" CTA)
6. Redirect to `/manager/announcements` on success

## Owner Notification Center (`/owner/announcements`)

### List View
- Fetches NotificationLog rows for current user, joined with Announcement, ordered by sentAt desc
- Each item shows: title, audience badge (All/Zone/Unit), date, unread dot indicator
- Unread = `readAt` is null (bold title + blue dot)

### Detail View (`/owner/announcements/[id]`)
- Fetches announcement by ID
- Renders: title, date, audience badge, full bodyHtml, attachment download link if present
- On page load: server action marks NotificationLog as read (`readAt = now()`)
- Back link to announcements list

## Nav Notification Bell

### TopBar Changes
- Add optional `unreadCount` prop to TopBar
- Add `Bell` icon (lucide-react) between the brand section and role badge
- If `unreadCount > 0`: show crimson circle badge with count
- Clicking bell: owners navigate to `/owner/announcements`, managers to `/manager/announcements`

### AppShell Changes
- Add optional `unreadCount` prop, passed through to TopBar

### Route Group Layout Changes
- Each layout (owner, manager, admin) queries unread count for current user
- Passes `unreadCount` to AppShell

### Unread Count Query
- Count NotificationLog rows where `userId = session.user.id` and `readAt IS NULL`

## Manager Archive (`/manager/announcements`)

### Table View
- All announcements ordered by sentAt desc
- Columns: Title, Audience, Sent Date, Sent Count, Read Count
- Sent Count: count of NotificationLog rows for that announcement
- Read Count: count where readAt is not null
- Each row links to a detail view showing full announcement content

## Email Template

Branded Terra State style matching existing emails:
- Logo header
- Title as heading
- First 200 chars of body text (stripped of HTML) as preview
- "View Announcement" crimson CTA button linking to `/owner/announcements/{id}`

## New Files

| File | Purpose |
|---|---|
| `src/lib/comms/actions.ts` | Server actions: sendAnnouncement, markAsRead |
| `src/lib/comms/queries.ts` | Queries: getAnnouncementsForUser, getAllAnnouncementsWithStats, getUnreadCount, getAnnouncementById |
| `src/lib/comms/email.ts` | Send announcement email via Resend |
| `src/components/comms/tiptap-editor.tsx` | Tiptap rich text editor with toolbar |
| `src/components/comms/audience-selector.tsx` | Audience type + zone/unit picker |
| `src/components/comms/file-attachment.tsx` | Single file upload with presign |
| `src/app/(manager)/manager/comms/new/page.tsx` | Compose page |
| `src/app/(manager)/manager/announcements/page.tsx` | Archive with delivery stats |
| `src/app/(owner)/owner/announcements/page.tsx` | Owner notification center |
| `src/app/(owner)/owner/announcements/[id]/page.tsx` | Announcement detail + mark read |

## Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add NotificationLog model, update Announcement + User |
| `src/app/api/r2/presign/route.ts` | Accept prefix param |
| `src/components/top-bar.tsx` | Add Bell icon with unread badge |
| `src/components/app-shell.tsx` | Accept + pass unreadCount prop |
| `src/app/(owner)/layout.tsx` | Query unreadCount, pass to AppShell |
| `src/app/(manager)/layout.tsx` | Query unreadCount, pass to AppShell |
| `src/app/(admin)/layout.tsx` | Query unreadCount, pass to AppShell |

## Nav Link Changes

Add to manager nav links (in `src/lib/nav-links.ts`):
- Change existing "Announcements" href from `/announcements` to `/announcements` (archive — already correct)
- Add "Compose" link with `Send` icon at href `/comms/new` (after Announcements)

Owner "Announcements" link already points to `/announcements` which will be the notification center.

## New Dependencies

- `@tiptap/react` — React bindings for Tiptap editor
- `@tiptap/starter-kit` — Basic formatting extensions
- `@tiptap/extension-link` — Link support
