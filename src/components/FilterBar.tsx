import { Search } from "lucide-react";
import type { ReactNode } from "react";

export function FilterBar({ children, placeholder = "搜索商品、单号、买手" }: { children?: ReactNode; placeholder?: string }) {
  return (
    <div className="panel mb-5 flex items-center gap-3 p-4">
      <div className="soft-input flex h-12 min-w-72 flex-1 items-center gap-3 px-4">
        <Search size={19} className="text-slate-400" />
        <input className="w-full bg-transparent text-sm outline-none" placeholder={placeholder} />
      </div>
      {children}
    </div>
  );
}

export function SelectFilter({ label, options }: { label: string; options: string[] }) {
  return (
    <select className="soft-input h-12 px-4 text-sm font-semibold text-slate-600" aria-label={label}>
      <option>{label}</option>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}
