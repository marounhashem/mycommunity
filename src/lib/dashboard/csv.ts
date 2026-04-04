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
