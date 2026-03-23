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

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return value.toLocaleString()
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

export default function DynamicTable({ data }: DynamicTableProps) {
  if (!data || data.length === 0) return null

  const rows = flattenTableData(data)
  if (rows.length === 0) return null

  const headers = Object.keys(rows[0])

  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-zinc-700">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-zinc-800/80">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-zinc-300 font-semibold border-b border-zinc-700 capitalize"
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
              className={i % 2 === 0 ? "bg-zinc-900/40" : "bg-zinc-900/20"}
            >
              {headers.map((h) => (
                <td
                  key={h}
                  className="px-3 py-2 text-zinc-300 border-b border-zinc-800"
                >
                  {formatCellValue(row[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
