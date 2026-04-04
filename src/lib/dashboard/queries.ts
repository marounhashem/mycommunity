import { prisma } from "@/lib/prisma";

// Use 2025 for demo data — change to new Date().getFullYear() for production
const currentYear = 2025;

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
