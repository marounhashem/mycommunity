# Reporting & Dashboard Module Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Build the manager and admin dashboards with KPI cards, Recharts visualizations, data tables, and CSV export. Includes a seed script for demo data.

## Dashboard Layout

2-column responsive grid (stacked on mobile):

- **Row 1:** 4 KPI cards (grid-cols-2 md:grid-cols-4)
- **Row 2:** Collection gauge donut (left) + Monthly payments bar chart (right)
- **Row 3:** Budget vs Actual table (left) + Ticket volume trend line (right)
- **Row 4:** Top outstanding debtors table (full width)
- **Row 5 (admin only):** Per-villa collection rate table (full width)

## KPI Cards

4 cards with icon, label, and value:

1. **Collection Rate %** — `(count PAID invoices / total invoices) * 100` for current year
2. **Total Outstanding (AED)** — `SUM(amountAed)` where status IN (UNPAID, OVERDUE)
3. **Open Tickets** — count where status IN (OPEN, IN_PROGRESS)
4. **Open Violations** — count where status = OPEN

Card styling: white bg, cream border, icon in crimson/teal/gold. Value in Cormorant Garamond bold, label in DM Sans muted.

## Charts

### Collection Gauge (Donut)

Recharts `PieChart` with `innerRadius`/`outerRadius` for donut effect.

3 segments from invoice status counts for current year:
- PAID → teal `#3D6B5E`
- OVERDUE → crimson `#7A1022`
- UNPAID → gold `#A0834A`

Center label shows collection rate percentage.

### Monthly Payment Collection (Bar Chart)

Recharts `BarChart` showing last 12 months.

X-axis: month labels (Jan, Feb, etc.)
Y-axis: AED amount
Bars: crimson `#7A1022` for collected, gold `#A0834A` stacked for outstanding

Data: aggregate `Payment.paidAt` by month for collected, aggregate `Invoice.amountAed` where UNPAID/OVERDUE by `dueDate` month for outstanding.

### Ticket Volume Trend (Line Chart)

Recharts `LineChart` showing last 12 months.

Two lines:
- New tickets (crimson `#7A1022`) — count by `createdAt` month
- Resolved tickets (teal `#3D6B5E`) — count where status IN (RESOLVED, CLOSED) by `createdAt` month

### Budget vs Actual Table

Static HTML table with hardcoded budget allocation percentages:

| Category | Budget % |
|---|---|
| FM (Facilities Management) | 35% |
| Security | 13% |
| Cleaning | 12% |
| Utilities | 13% |
| Management | 22% |
| Other | 5% |

Actual % column: derived from total collected this year applied against budget percentages. For now, show budget % only (actual tracking requires expense categories not yet in schema).

## Data Tables

### Top Outstanding Debtors

Table showing units with highest unpaid amounts:
- Columns: Unit Number, Zone, Amount Outstanding (AED), Days Overdue (from earliest unpaid invoice due date)
- Sorted by amount descending
- Top 10

### Per-Villa Collection Rate (Admin Only)

Table showing every unit's collection performance:
- Columns: Unit Number, Zone, Total Invoiced (AED), Total Paid (AED), Collection Rate %
- Sorted by collection rate ascending (worst performers first)
- Only rendered when `session.user.role === "ADMIN"`

## CSV Export

Reusable client utility `exportCsv(filename, headers, rows)`:
- Converts arrays to CSV string
- Creates Blob with `text/csv` MIME type
- Triggers browser download

Each section gets a small "Export CSV" button (icon + text).

## Seed Script

`prisma/seed.ts` creates demo data:
- 20 units across 4 zones (A, B, C, D)
- 20 owners (one per unit) with OWNER role users
- 2 manager users, 1 admin user
- 80 invoices (4 quarters × 20 units) — mix of PAID, UNPAID, OVERDUE
- 40 payments for paid invoices
- 15 tickets with various statuses
- 5 violations

Configured in `package.json` as `"prisma": { "seed": "npx tsx prisma/seed.ts" }`.

## Chart Colors

- Primary: crimson `#7A1022`
- Secondary: gold `#A0834A`
- Tertiary: teal `#3D6B5E`
- Background: cream `#F0EDE6`
- Muted: sage `#6B7F5B`

## New Files

| File | Purpose |
|---|---|
| `src/lib/dashboard/queries.ts` | All dashboard aggregate queries |
| `src/lib/dashboard/csv.ts` | CSV export utility |
| `src/components/dashboard/kpi-cards.tsx` | 4 KPI card row |
| `src/components/dashboard/collection-gauge.tsx` | Donut chart |
| `src/components/dashboard/monthly-payments.tsx` | Bar chart |
| `src/components/dashboard/ticket-trend.tsx` | Line chart |
| `src/components/dashboard/budget-table.tsx` | Static budget table |
| `src/components/dashboard/debtors-table.tsx` | Top outstanding debtors |
| `src/components/dashboard/villa-collection.tsx` | Admin per-villa table |
| `src/components/dashboard/csv-button.tsx` | Reusable export button |
| `src/app/(manager)/manager/dashboard/page.tsx` | Manager dashboard (replace) |
| `src/app/(admin)/admin/dashboard/page.tsx` | Admin dashboard (replace, includes villa table) |
| `prisma/seed.ts` | Demo data seed script |

## Modified Files

| File | Change |
|---|---|
| `package.json` | Add recharts, tsx; add prisma.seed config |

## Dependencies

- `recharts` — React charting library
- `tsx` (devDependency) — TypeScript execution for seed script
