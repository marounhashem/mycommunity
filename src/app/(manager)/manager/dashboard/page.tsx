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

  const safe = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Community management overview</p>
      </div>

      <KpiCards {...safe(kpis)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CollectionGauge data={safe(gaugeData)} collectionRate={kpis.collectionRate} />
        <MonthlyPayments data={safe(monthlyData)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BudgetTable />
        <TicketTrend data={safe(ticketData)} />
      </div>

      <DebtorsTable data={safe(debtorsData)} />
    </div>
  );
}
