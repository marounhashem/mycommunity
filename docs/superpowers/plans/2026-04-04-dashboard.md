# Dashboard Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the manager/admin reporting dashboard with Recharts visualizations, KPI cards, data tables, CSV export, and a seed script for demo data.

**Architecture:** Server component pages query Prisma aggregates, pass data as props to client chart components. Each chart is an isolated client component. CSV export is a shared client utility. Seed script populates demo data via `prisma db seed`.

**Tech Stack:** Next.js 14, Prisma 7, Recharts, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-dashboard-design.md`

---

### Task 1: Install recharts and tsx

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install recharts
npm install -D tsx
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install recharts and tsx for dashboard module"
```

---

### Task 2: Dashboard queries

**Files:**
- Create: `src/lib/dashboard/queries.ts`

- [ ] **Step 1: Create dashboard queries**

Create `src/lib/dashboard/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma";

const currentYear = new Date().getFullYear();

export async function getKpis() {
  const [totalInvoices, paidInvoices, outstandingResult, openTickets, openViolations] =
    await Promise.all([
      prisma.invoice.count({ where: { year: currentYear } }),
      prisma.invoice.count({ where: { year: currentYear, status: "PAID" } }),
      prisma.invoice.aggregate({
        where: { status: { in: ["UNPAID", "OVERDUE"] } },
        _sum: { amountAed: true },
      }),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.violation.count({ where: { status: "OPEN" } }),
    ]);

  return {
    collectionRate: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
    totalOutstanding: Number(outstandingResult._sum.amountAed ?? 0),
    openTickets,
    openViolations,
  };
}

export async function getCollectionGaugeData() {
  const [paid, overdue, unpaid] = await Promise.all([
    prisma.invoice.count({ where: { year: currentYear, status: "PAID" } }),
    prisma.invoice.count({ where: { year: currentYear, status: "OVERDUE" } }),
    prisma.invoice.count({ where: { year: currentYear, status: "UNPAID" } }),
  ]);
  return [
    { name: "Paid", value: paid, color: "#3D6B5E" },
    { name: "Overdue", value: overdue, color: "#7A1022" },
    { name: "Unpaid", value: unpaid, color: "#A0834A" },
  ];
}

export async function getMonthlyPayments() {
  const now = new Date();
  const months: { month: string; collected: number; outstanding: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const label = date.toLocaleString("default", { month: "short", year: "2-digit" });

    const [paymentsResult, outstandingResult] = await Promise.all([
      prisma.payment.aggregate({
        where: { paidAt: { gte: date, lt: endDate } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          dueDate: { gte: date, lt: endDate },
          status: { in: ["UNPAID", "OVERDUE"] },
        },
        _sum: { amountAed: true },
      }),
    ]);

    months.push({
      month: label,
      collected: Number(paymentsResult._sum.amount ?? 0),
      outstanding: Number(outstandingResult._sum.amountAed ?? 0),
    });
  }

  return months;
}

export async function getTicketTrend() {
  const now = new Date();
  const months: { month: string; created: number; resolved: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const label = date.toLocaleString("default", { month: "short", year: "2-digit" });

    const [created, resolved] = await Promise.all([
      prisma.ticket.count({
        where: { createdAt: { gte: date, lt: endDate } },
      }),
      prisma.ticket.count({
        where: {
          createdAt: { gte: date, lt: endDate },
          status: { in: ["RESOLVED", "CLOSED"] },
        },
      }),
    ]);

    months.push({ month: label, created, resolved });
  }

  return months;
}

export async function getTopDebtors() {
  const units = await prisma.unit.findMany({
    include: {
      invoices: {
        where: { status: { in: ["UNPAID", "OVERDUE"] } },
        select: { amountAed: true, dueDate: true },
      },
    },
  });

  const debtors = units
    .map((u) => {
      const total = u.invoices.reduce((sum, inv) => sum + Number(inv.amountAed), 0);
      const earliest = u.invoices.reduce(
        (min, inv) => (inv.dueDate < min ? inv.dueDate : min),
        new Date()
      );
      const daysOverdue = Math.max(
        0,
        Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        unitNumber: u.unitNumber,
        zone: u.zone,
        amount: total,
        daysOverdue: u.invoices.length > 0 ? daysOverdue : 0,
      };
    })
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return debtors;
}

export async function getVillaCollectionRates() {
  const units = await prisma.unit.findMany({
    include: {
      invoices: {
        where: { year: currentYear },
        select: { amountAed: true, status: true },
      },
    },
    orderBy: { unitNumber: "asc" },
  });

  return units.map((u) => {
    const totalInvoiced = u.invoices.reduce((sum, inv) => sum + Number(inv.amountAed), 0);
    const totalPaid = u.invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + Number(inv.amountAed), 0);
    const rate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
    return {
      unitNumber: u.unitNumber,
      zone: u.zone,
      totalInvoiced,
      totalPaid,
      collectionRate: rate,
    };
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard/
git commit -m "feat: add dashboard aggregate queries"
```

---

### Task 3: CSV export utility and button

**Files:**
- Create: `src/lib/dashboard/csv.ts`
- Create: `src/components/dashboard/csv-button.tsx`

- [ ] **Step 1: Create CSV utility**

Create `src/lib/dashboard/csv.ts`:

```typescript
export function generateCsv(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    row.map((cell) => {
      const str = String(cell);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = generateCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create CSV button component**

Create `src/components/dashboard/csv-button.tsx`:

```tsx
"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/dashboard/csv";

interface CsvButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

export function CsvButton({ filename, headers, rows }: CsvButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
      onClick={() => downloadCsv(filename, headers, rows)}
    >
      <Download className="h-3.5 w-3.5 mr-1" />
      Export CSV
    </Button>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/dashboard/csv.ts src/components/dashboard/csv-button.tsx
git commit -m "feat: add CSV export utility and button component"
```

---

### Task 4: KPI cards component

**Files:**
- Create: `src/components/dashboard/kpi-cards.tsx`

- [ ] **Step 1: Create KPI cards**

Create `src/components/dashboard/kpi-cards.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Percent, DollarSign, Ticket, AlertTriangle } from "lucide-react";

interface KpiCardsProps {
  collectionRate: number;
  totalOutstanding: number;
  openTickets: number;
  openViolations: number;
}

export function KpiCards({ collectionRate, totalOutstanding, openTickets, openViolations }: KpiCardsProps) {
  const cards = [
    {
      label: "Collection Rate",
      value: `${collectionRate}%`,
      icon: Percent,
      iconColor: "text-teal",
    },
    {
      label: "Total Outstanding",
      value: `${totalOutstanding.toLocaleString()} AED`,
      icon: DollarSign,
      iconColor: "text-crimson",
    },
    {
      label: "Open Tickets",
      value: String(openTickets),
      icon: Ticket,
      iconColor: "text-gold",
    },
    {
      label: "Open Violations",
      value: String(openViolations),
      icon: AlertTriangle,
      iconColor: "text-crimson",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${card.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
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
git add src/components/dashboard/kpi-cards.tsx
git commit -m "feat: add KPI cards component for dashboard"
```

---

### Task 5: Collection gauge donut chart

**Files:**
- Create: `src/components/dashboard/collection-gauge.tsx`

- [ ] **Step 1: Create collection gauge**

Create `src/components/dashboard/collection-gauge.tsx`:

```tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { CsvButton } from "./csv-button";

interface CollectionGaugeProps {
  data: { name: string; value: number; color: string }[];
  collectionRate: number;
}

export function CollectionGauge({ data, collectionRate }: CollectionGaugeProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-semibold">Collection Status</h3>
          <CsvButton
            filename="collection-status.csv"
            headers={["Status", "Count", "Percentage"]}
            rows={data.map((d) => [d.name, d.value, total > 0 ? `${Math.round((d.value / total) * 100)}%` : "0%"])}
          />
        </div>
        <div className="h-[250px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="font-heading text-3xl font-bold text-foreground">{collectionRate}%</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/collection-gauge.tsx
git commit -m "feat: add collection gauge donut chart"
```

---

### Task 6: Monthly payments bar chart

**Files:**
- Create: `src/components/dashboard/monthly-payments.tsx`

- [ ] **Step 1: Create monthly payments chart**

Create `src/components/dashboard/monthly-payments.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { CsvButton } from "./csv-button";

interface MonthlyPaymentsProps {
  data: { month: string; collected: number; outstanding: number }[];
}

export function MonthlyPayments({ data }: MonthlyPaymentsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-semibold">Monthly Collections (AED)</h3>
          <CsvButton
            filename="monthly-collections.csv"
            headers={["Month", "Collected (AED)", "Outstanding (AED)"]}
            rows={data.map((d) => [d.month, d.collected, d.outstanding])}
          />
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0DAC9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="collected" name="Collected" fill="#7A1022" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#A0834A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/monthly-payments.tsx
git commit -m "feat: add monthly payments bar chart"
```

---

### Task 7: Ticket trend line chart + Budget table

**Files:**
- Create: `src/components/dashboard/ticket-trend.tsx`
- Create: `src/components/dashboard/budget-table.tsx`

- [ ] **Step 1: Create ticket trend chart**

Create `src/components/dashboard/ticket-trend.tsx`:

```tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { CsvButton } from "./csv-button";

interface TicketTrendProps {
  data: { month: string; created: number; resolved: number }[];
}

export function TicketTrend({ data }: TicketTrendProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-semibold">Ticket Volume</h3>
          <CsvButton
            filename="ticket-trend.csv"
            headers={["Month", "Created", "Resolved"]}
            rows={data.map((d) => [d.month, d.created, d.resolved])}
          />
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0DAC9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" name="New" stroke="#7A1022" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#3D6B5E" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create budget table**

Create `src/components/dashboard/budget-table.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { CsvButton } from "./csv-button";

const BUDGET_DATA = [
  { category: "FM (Facilities Management)", percentage: 35 },
  { category: "Security", percentage: 13 },
  { category: "Cleaning", percentage: 12 },
  { category: "Utilities", percentage: 13 },
  { category: "Management", percentage: 22 },
  { category: "Other", percentage: 5 },
];

export function BudgetTable() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-semibold">Budget Allocation</h3>
          <CsvButton
            filename="budget-allocation.csv"
            headers={["Category", "Budget %"]}
            rows={BUDGET_DATA.map((d) => [d.category, `${d.percentage}%`])}
          />
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_3fr] gap-2 px-3 py-2 bg-muted/30 text-xs font-semibold">
            <span>Category</span>
            <span>Budget %</span>
            <span></span>
          </div>
          {BUDGET_DATA.map((row) => (
            <div key={row.category} className="grid grid-cols-[2fr_1fr_3fr] gap-2 px-3 py-2 border-t border-border text-sm items-center">
              <span className="text-foreground">{row.category}</span>
              <span className="font-medium">{row.percentage}%</span>
              <div className="h-2 rounded-full bg-cream-300 overflow-hidden">
                <div
                  className="h-full rounded-full bg-crimson"
                  style={{ width: `${row.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/ticket-trend.tsx src/components/dashboard/budget-table.tsx
git commit -m "feat: add ticket trend line chart and budget allocation table"
```

---

### Task 8: Debtors table + Villa collection table

**Files:**
- Create: `src/components/dashboard/debtors-table.tsx`
- Create: `src/components/dashboard/villa-collection.tsx`

- [ ] **Step 1: Create debtors table**

Create `src/components/dashboard/debtors-table.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { CsvButton } from "./csv-button";

interface DebtorsTableProps {
  data: { unitNumber: string; zone: string; amount: number; daysOverdue: number }[];
}

export function DebtorsTable({ data }: DebtorsTableProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-semibold">Top Outstanding Debtors</h3>
          <CsvButton
            filename="top-debtors.csv"
            headers={["Unit", "Zone", "Outstanding (AED)", "Days Overdue"]}
            rows={data.map((d) => [d.unitNumber, d.zone, d.amount, d.daysOverdue])}
          />
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No outstanding debts.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-3 py-2 bg-muted/30 text-xs font-semibold">
              <span>Unit</span><span>Zone</span><span>Outstanding (AED)</span><span>Days Overdue</span>
            </div>
            {data.map((row) => (
              <div key={row.unitNumber} className="grid grid-cols-4 gap-4 px-3 py-2 border-t border-border text-sm">
                <span className="font-medium">{row.unitNumber}</span>
                <span className="text-muted-foreground">{row.zone}</span>
                <span className="text-crimson font-medium">{row.amount.toLocaleString()} AED</span>
                <span className={row.daysOverdue > 90 ? "text-crimson font-medium" : "text-muted-foreground"}>
                  {row.daysOverdue}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create villa collection table**

Create `src/components/dashboard/villa-collection.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { CsvButton } from "./csv-button";

interface VillaCollectionProps {
  data: { unitNumber: string; zone: string; totalInvoiced: number; totalPaid: number; collectionRate: number }[];
}

export function VillaCollection({ data }: VillaCollectionProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-semibold">Per-Villa Collection Rate</h3>
          <CsvButton
            filename="villa-collection.csv"
            headers={["Unit", "Zone", "Invoiced (AED)", "Paid (AED)", "Rate %"]}
            rows={data.map((d) => [d.unitNumber, d.zone, d.totalInvoiced, d.totalPaid, `${d.collectionRate}%`])}
          />
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No data.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-5 gap-4 px-3 py-2 bg-muted/30 text-xs font-semibold sticky top-0">
              <span>Unit</span><span>Zone</span><span>Invoiced</span><span>Paid</span><span>Rate</span>
            </div>
            {data.map((row) => (
              <div key={row.unitNumber} className="grid grid-cols-5 gap-4 px-3 py-2 border-t border-border text-sm">
                <span className="font-medium">{row.unitNumber}</span>
                <span className="text-muted-foreground">{row.zone}</span>
                <span>{row.totalInvoiced.toLocaleString()}</span>
                <span>{row.totalPaid.toLocaleString()}</span>
                <span className={row.collectionRate < 50 ? "text-crimson font-medium" : row.collectionRate < 80 ? "text-gold font-medium" : "text-teal font-medium"}>
                  {row.collectionRate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/debtors-table.tsx src/components/dashboard/villa-collection.tsx
git commit -m "feat: add debtors table and villa collection rate table"
```

---

### Task 9: Manager dashboard page

**Files:**
- Modify: `src/app/(manager)/manager/dashboard/page.tsx`

- [ ] **Step 1: Replace manager dashboard with full reporting page**

Replace the entire contents of `src/app/(manager)/manager/dashboard/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getKpis,
  getCollectionGaugeData,
  getMonthlyPayments,
  getTicketTrend,
  getTopDebtors,
} from "@/lib/dashboard/queries";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import dynamic from "next/dynamic";
import { BudgetTable } from "@/components/dashboard/budget-table";
import { DebtorsTable } from "@/components/dashboard/debtors-table";

const CollectionGauge = dynamic(
  () => import("@/components/dashboard/collection-gauge").then((m) => m.CollectionGauge),
  { ssr: false }
);
const MonthlyPayments = dynamic(
  () => import("@/components/dashboard/monthly-payments").then((m) => m.MonthlyPayments),
  { ssr: false }
);
const TicketTrend = dynamic(
  () => import("@/components/dashboard/ticket-trend").then((m) => m.TicketTrend),
  { ssr: false }
);

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [kpis, gaugeData, monthlyData, ticketData, debtorsData] = await Promise.all([
    getKpis(),
    getCollectionGaugeData(),
    getMonthlyPayments(),
    getTicketTrend(),
    getTopDebtors(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Community management overview</p>
      </div>

      <KpiCards {...kpis} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CollectionGauge data={gaugeData} collectionRate={kpis.collectionRate} />
        <MonthlyPayments data={monthlyData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BudgetTable />
        <TicketTrend data={ticketData} />
      </div>

      <DebtorsTable data={debtorsData} />
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
git add "src/app/(manager)/manager/dashboard/"
git commit -m "feat: replace manager dashboard placeholder with full reporting page"
```

---

### Task 10: Admin dashboard page (includes villa collection)

**Files:**
- Modify: `src/app/(admin)/admin/dashboard/page.tsx`

- [ ] **Step 1: Replace admin dashboard**

Replace the entire contents of `src/app/(admin)/admin/dashboard/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getKpis,
  getCollectionGaugeData,
  getMonthlyPayments,
  getTicketTrend,
  getTopDebtors,
  getVillaCollectionRates,
} from "@/lib/dashboard/queries";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import dynamic from "next/dynamic";
import { BudgetTable } from "@/components/dashboard/budget-table";
import { DebtorsTable } from "@/components/dashboard/debtors-table";
import { VillaCollection } from "@/components/dashboard/villa-collection";

const CollectionGauge = dynamic(
  () => import("@/components/dashboard/collection-gauge").then((m) => m.CollectionGauge),
  { ssr: false }
);
const MonthlyPayments = dynamic(
  () => import("@/components/dashboard/monthly-payments").then((m) => m.MonthlyPayments),
  { ssr: false }
);
const TicketTrend = dynamic(
  () => import("@/components/dashboard/ticket-trend").then((m) => m.TicketTrend),
  { ssr: false }
);

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [kpis, gaugeData, monthlyData, ticketData, debtorsData, villaData] = await Promise.all([
    getKpis(),
    getCollectionGaugeData(),
    getMonthlyPayments(),
    getTicketTrend(),
    getTopDebtors(),
    getVillaCollectionRates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System administration & reporting</p>
      </div>

      <KpiCards {...kpis} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CollectionGauge data={gaugeData} collectionRate={kpis.collectionRate} />
        <MonthlyPayments data={monthlyData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BudgetTable />
        <TicketTrend data={ticketData} />
      </div>

      <DebtorsTable data={debtorsData} />

      <VillaCollection data={villaData} />
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
git add "src/app/(admin)/admin/dashboard/"
git commit -m "feat: replace admin dashboard with full reporting page including villa collection"
```

---

### Task 11: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma.seed config)

- [ ] **Step 1: Create seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const ZONES = ["A", "B", "C", "D"];

async function main() {
  console.log("Seeding...");

  // Create admin, managers
  const adminPw = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@terrastate.ae" },
    update: {},
    create: { email: "admin@terrastate.ae", role: "ADMIN", hashedPassword: adminPw },
  });

  const mgr1 = await prisma.user.upsert({
    where: { email: "manager1@terrastate.ae" },
    update: {},
    create: { email: "manager1@terrastate.ae", role: "MANAGER", hashedPassword: adminPw },
  });

  const mgr2 = await prisma.user.upsert({
    where: { email: "manager2@terrastate.ae" },
    update: {},
    create: { email: "manager2@terrastate.ae", role: "MANAGER", hashedPassword: adminPw },
  });

  // Create units and owners
  const ownerPw = await hash("owner123", 12);
  const units = [];
  const owners = [];

  for (let i = 1; i <= 20; i++) {
    const zone = ZONES[(i - 1) % 4];
    const unit = await prisma.unit.upsert({
      where: { id: `unit-${i}` },
      update: {},
      create: { id: `unit-${i}`, unitNumber: `V${String(i).padStart(3, "0")}`, zone, sqft: 2000 + i * 100 },
    });
    units.push(unit);

    const user = await prisma.user.upsert({
      where: { email: `owner${i}@example.com` },
      update: {},
      create: { email: `owner${i}@example.com`, role: "OWNER", hashedPassword: ownerPw },
    });

    const owner = await prisma.owner.create({
      data: { userId: user.id, unitId: unit.id, phone: `+971500000${String(i).padStart(3, "0")}` },
    }).catch(() => null); // skip if already exists
    if (owner) owners.push(owner);
  }

  // Create invoices — 4 quarters for each unit
  const periods = ["Q1", "Q2", "Q3", "Q4"];
  const year = 2026;

  for (const unit of units) {
    for (let q = 0; q < 4; q++) {
      const amount = 5000 + Math.floor(Math.random() * 3000);
      const dueDate = new Date(year, q * 3 + 2, 15); // Mar, Jun, Sep, Dec
      const rand = Math.random();
      const status = q < 2 ? (rand < 0.7 ? "PAID" : rand < 0.85 ? "OVERDUE" : "UNPAID") : (rand < 0.3 ? "PAID" : "UNPAID");

      const invoice = await prisma.invoice.create({
        data: {
          unitId: unit.id,
          amountAed: amount,
          dueDate,
          status: status as any,
          period: periods[q],
          year,
        },
      });

      if (status === "PAID") {
        const paidDate = new Date(dueDate);
        paidDate.setDate(paidDate.getDate() - Math.floor(Math.random() * 20));
        await prisma.payment.create({
          data: { invoiceId: invoice.id, amount, paidAt: paidDate },
        });
      }
    }
  }

  // Create tickets
  const categories = ["Maintenance", "Cleaning", "Security", "Landscaping", "Other"];
  const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

  for (let i = 0; i < 15; i++) {
    const unit = units[i % units.length];
    const createdAt = new Date(2026, Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1);
    await prisma.ticket.create({
      data: {
        unitId: unit.id,
        category: categories[i % categories.length],
        description: `Sample ticket ${i + 1} for unit ${unit.unitNumber}`,
        priority: priorities[i % priorities.length],
        status: statuses[i % statuses.length],
        createdAt,
      },
    });
  }

  // Create violations
  const rules = ["Noise After Hours", "Parking Violation", "Pet Policy Violation", "Common Area Misuse", "Waste Disposal Violation"];
  for (let i = 0; i < 5; i++) {
    await prisma.violation.create({
      data: {
        unitId: units[i * 4].id,
        issuedById: mgr1.id,
        ruleBreached: rules[i],
        description: `Violation notice for ${rules[i]}`,
        fineAmountAed: [500, 1000, 250, 750, 300][i],
        status: i < 3 ? "OPEN" : "RESOLVED",
        resolvedAt: i >= 3 ? new Date() : null,
      },
    });
  }

  console.log("Seed complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Add prisma seed config to package.json**

Add to the root of `package.json` (after the `devDependencies` block):

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```

- [ ] **Step 4: Verify build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed script with demo data for dashboard"
```

---

### Task 12: Final verification and push

- [ ] **Step 1: Full build**

```bash
npx next build
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Push**

```bash
git push origin main
```
