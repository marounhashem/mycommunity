# Auth System & App Shell Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Build the authentication system and shared app shell for MyCommunity. Implements credentials login, magic link login via Resend, role-based route groups, and a branded layout shell with crimson top bar, teal sidebar, and cream content area.

## Authentication

### Credentials Login

- Email + password form on `/login` page
- Validates against `hashedPassword` in the User model via bcryptjs
- On success, redirects to role-based dashboard:
  - OWNER → `/(owner)/dashboard`
  - MANAGER → `/(manager)/dashboard`
  - ADMIN → `/(admin)/dashboard`

### Magic Link Login (Resend)

- Same `/login` page, tabbed UI: "Password" | "Magic Link"
- Magic Link tab: email-only form, calls `signIn("email", { email })`
- NextAuth `EmailProvider` configured with Resend as the transport
- Custom `sendVerificationRequest` function calls Resend API to send branded email
- On first login (hashedPassword is null), redirect to `/set-password`
- `/set-password` requires an active session, lets user choose a password
- Password hashed with bcryptjs, saved to `hashedPassword`
- After password set, redirect to role-based dashboard

### Session & JWT

- JWT strategy (existing)
- Token contains: `sub` (user ID), `email`, `role`, `needsPassword` (boolean)
- Session exposes: `user.id`, `user.email`, `user.role`
- `needsPassword` flag set in `signIn` callback when `hashedPassword` is null

## Route Protection

### Middleware (`src/middleware.ts`)

Single middleware at root enforcing all auth rules:

1. Get token via `getToken()`
2. If no token + protected route → redirect `/login`
3. If `token.needsPassword` + not on `/set-password` → redirect `/set-password`
4. If token + on `/login` → redirect to role-based dashboard
5. Check role vs route group:
   - `/(owner)/*` → requires OWNER role
   - `/(manager)/*` → requires MANAGER or ADMIN role
   - `/(admin)/*` → requires ADMIN role
6. If unauthorized → redirect to own role's dashboard

### Public Routes (no auth required)

- `/login`
- `/set-password`
- `/api/auth/*`

## Route Groups & File Structure

```
src/app/
  layout.tsx                          → Root layout (fonts, metadata — no shell)
  (public)/
    login/page.tsx                    → Tabbed login (credentials + magic link)
    set-password/page.tsx             → First-time password setup
  (owner)/
    layout.tsx                        → AppShell with owner nav links
    dashboard/page.tsx                → Owner home (placeholder)
  (manager)/
    layout.tsx                        → AppShell with manager nav links
    dashboard/page.tsx                → Manager home (placeholder)
  (admin)/
    layout.tsx                        → AppShell with admin nav links
    dashboard/page.tsx                → Admin home (placeholder)
  api/
    auth/[...nextauth]/route.ts       → Existing NextAuth handler
    set-password/route.ts             → API to hash + save password
middleware.ts                         → Role-based route protection
```

## Sidebar Links Per Role

### OWNER
- Dashboard
- My Unit
- My Invoices
- My Tickets
- Announcements

### MANAGER
- Dashboard
- All Units
- All Invoices
- All Tickets
- Announcements
- Renovation Apps
- Violations

### ADMIN
- Dashboard
- All Units
- All Invoices
- All Tickets
- Announcements
- Renovation Apps
- Violations
- User Management
- Settings

## App Shell Design

### Layout: Top Nav + Sidebar Hybrid

Crimson top bar for brand identity, teal sidebar for module navigation, cream content area.

### TopBar Component

- Background: crimson `#7A1022`
- Left: white square logo with "TERRA STATE" text + "MyCommunity" in Cormorant Garamond
- Right: role badge (white translucent pill) + avatar circle (gold `#A0834A`, user initials)
- Fixed height

### Sidebar Component

- Background: teal `#2E4F42`
- Width: 220px on desktop
- Active link: gold `#A0834A` left border + subtle white background
- Inactive links: 70% opacity
- Sign out link at bottom, separated by border
- Mobile: hamburger toggle in top bar, slides in as overlay (shadcn Sheet)
- Links passed as props from route group layout

### Content Area

- Background: cream `#F0EDE6`
- Page headings: Cormorant Garamond, bold
- Body text: DM Sans
- Cards: white background, cream border `#E0DAC9`

### Component Structure

```
<AppShell links={[...]} user={session.user}>
  <TopBar />
  <div class="flex">
    <Sidebar />
    <main>{children}</main>
  </div>
</AppShell>
```

## Login Page Design

- Centered card on cream background
- White card with subtle shadow and cream border
- Logo + "MyCommunity" branding at top center
- Two tabs: "Password" (crimson active indicator) and "Magic Link"
- Password tab: email + password fields, crimson "Sign In" button
- Magic Link tab: email-only field, teal "Send Magic Link" button
- Error states: red banner above the form
- After magic link first login → redirect to `/set-password`

## Typography

- **Headings:** Cormorant Garamond (400, 600, 700) — via `next/font/google`
- **Body:** DM Sans (400, 500, 600) — via `next/font/google`
- CSS variables: `--font-heading` (Cormorant Garamond), `--font-sans` (DM Sans)
- Replace existing Inter font in root layout

## New Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | Route protection + role enforcement |
| `src/app/(public)/login/page.tsx` | Tabbed login page |
| `src/app/(public)/set-password/page.tsx` | First-time password setup |
| `src/app/(owner)/layout.tsx` | AppShell with owner links |
| `src/app/(owner)/dashboard/page.tsx` | Owner dashboard placeholder |
| `src/app/(manager)/layout.tsx` | AppShell with manager links |
| `src/app/(manager)/dashboard/page.tsx` | Manager dashboard placeholder |
| `src/app/(admin)/layout.tsx` | AppShell with admin links |
| `src/app/(admin)/dashboard/page.tsx` | Admin dashboard placeholder |
| `src/components/app-shell.tsx` | Shared layout shell |
| `src/components/top-bar.tsx` | Crimson top bar |
| `src/components/sidebar.tsx` | Teal sidebar with nav links |
| `src/lib/nav-links.ts` | Link definitions per role |
| `src/app/api/set-password/route.ts` | API to hash + save password |

## Dependencies

### New npm packages
- `resend` — email transport for magic links

### shadcn/ui components to install
- `input`, `label`, `tabs`, `card`, `avatar`, `badge`, `sheet`, `separator`

### Environment variables needed
- `RESEND_API_KEY` — from Resend dashboard
- `NEXTAUTH_SECRET` — already configured
- `NEXTAUTH_URL` — already configured

## Prisma Schema Changes

Two schema changes required, delivered as a single migration:

**1. Make `hashedPassword` nullable** — magic link users won't have a password on first login:
```prisma
hashedPassword  String?  @map("hashed_password")  // was String (non-nullable)
```

**2. Add VerificationToken model** — required by NextAuth's `EmailProvider` for magic link tokens:
```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

Both changes applied via `prisma migrate dev --name add-magic-link-support`.
