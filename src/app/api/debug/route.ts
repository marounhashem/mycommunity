import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test each query individually
    const results: Record<string, unknown> = {};

    try {
      const invoiceCount = await prisma.invoice.count({ where: { year: 2025 } });
      results.invoiceCount2025 = invoiceCount;
    } catch (e: any) { results.invoiceError = e.message; }

    try {
      const paidCount = await prisma.invoice.count({ where: { year: 2025, status: "PAID" } });
      results.paidCount = paidCount;
    } catch (e: any) { results.paidError = e.message; }

    try {
      const agg = await prisma.invoice.aggregate({
        where: { status: { in: ["UNPAID", "OVERDUE"] } },
        _sum: { amountAed: true },
      });
      results.outstanding = String(agg._sum.amountAed);
    } catch (e: any) { results.aggError = e.message; }

    try {
      const tickets = await prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
      results.openTickets = tickets;
    } catch (e: any) { results.ticketError = e.message; }

    try {
      const violations = await prisma.violation.count({ where: { status: "OPEN" } });
      results.openViolations = violations;
    } catch (e: any) { results.violationError = e.message; }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
