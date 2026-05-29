import type { ReactNode } from "react";

export interface GridColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
  render: (row: T, rowIndex: number) => ReactNode;
}

interface EditableGridProps<T> {
  columns: GridColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  maxHeight?: string;
}

export function EditableGrid<T>({ columns, rows, getRowKey, maxHeight = "560px" }: EditableGridProps<T>) {
  return (
    <div className="overflow-hidden border border-slate-300 bg-white">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="min-w-max border-separate border-spacing-0 text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`border-b border-r border-slate-300 bg-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700 ${column.className ?? ""}`}
                  style={{ width: column.width, minWidth: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={getRowKey(row)} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`h-8 border-b border-r border-slate-200 px-1 align-middle ${
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : "text-left"
                    } ${column.className ?? ""}`}
                  >
                    {column.render(row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={columns.length}>
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
