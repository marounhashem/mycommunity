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
