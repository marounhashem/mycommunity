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
