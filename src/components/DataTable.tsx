import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({ columns, data }: { columns: Column<T>[]; data: T[] }) {
  return (
    <div className="panel overflow-hidden">
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-white/50 text-xs uppercase tracking-wide text-slate-400">
            {columns.map((column) => <th key={column.key} className="px-5 py-4 font-black">{column.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="table-row">
              {columns.map((column) => <td key={column.key} className="px-5 py-4 align-middle font-semibold text-slate-700">{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between px-5 py-4 text-sm font-bold text-slate-400">
        <span>共 {data.length} 条记录</span>
        <div className="flex gap-2">
          <button className="ghost-btn px-3 py-2">上一页</button>
          <button className="ghost-btn bg-slate-900 px-3 py-2 text-white">1</button>
          <button className="ghost-btn px-3 py-2">下一页</button>
        </div>
      </div>
    </div>
  );
}
