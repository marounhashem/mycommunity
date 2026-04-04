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
