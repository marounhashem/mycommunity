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
