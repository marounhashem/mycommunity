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
