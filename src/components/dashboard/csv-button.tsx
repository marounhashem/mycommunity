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
