"use client"

interface DynamicTableProps {
  data: Record<string, unknown>[]
}

function flattenTableData(data: unknown[]): Record<string, unknown>[] {
  const flat: Record<string, unknown>[] = []
  for (const item of data) {
    if (Array.isArray(item)) {
      flat.push(...flattenTableData(item))
    } else if (item && typeof item === "object") {
      flat.push(item as Record<string, unknown>)
    }
  }
  return flat
}

function isNumericColumn(rows: Record<string, unknown>[], header: string): boolean {
  return rows.some((row) => typeof row[header] === "number")
}

function formatCellValue(value: unknown, header: string): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "number") {
    // If header suggests percentage, format accordingly
    if (header.toLowerCase().includes("%")) {
      return `${value.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    }
    return value.toLocaleString("es-CL")
  }
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

export default function DynamicTable({ data }: DynamicTableProps) {
  if (!data || data.length === 0) return null

  const rows = flattenTableData(data)
  if (rows.length === 0) return null

  const headers = Object.keys(rows[0])

  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-zinc-700/60 shadow-sm">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-zinc-800">
            {headers.map((h, idx) => (
              <th
                key={h}
                className={`px-4 py-2.5 font-semibold border-b border-zinc-600 whitespace-nowrap ${
                  isNumericColumn(rows, h) ? "text-right" : "text-left"
                } ${idx > 0 ? "border-l border-zinc-700" : ""} text-zinc-200`}
              >
                {h.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`${
                i % 2 === 0 ? "bg-zinc-900/50" : "bg-zinc-800/30"
              } hover:bg-zinc-700/40 transition-colors`}
            >
              {headers.map((h, idx) => (
                <td
                  key={h}
                  className={`px-4 py-2 border-b border-zinc-800/60 whitespace-nowrap ${
                    isNumericColumn(rows, h)
                      ? "text-right tabular-nums font-mono text-zinc-200"
                      : "text-zinc-300"
                  } ${idx > 0 ? "border-l border-zinc-800/60" : ""}`}
                >
                  {formatCellValue(row[h], h)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
