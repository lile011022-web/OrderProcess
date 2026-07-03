import type { LucideIcon } from "lucide-react";

export function StatCard({ title, value, hint, icon: Icon, tone = "sky" }: { title: string; value: string; hint?: string; icon?: LucideIcon; tone?: "sky" | "green" | "orange" | "violet" | "rose" | "slate" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-ink">{value}</p>
          {hint && <p className="mt-2 text-xs font-semibold text-slate-400">{hint}</p>}
        </div>
        {Icon && <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon size={21} /></div>}
      </div>
    </div>
  );
}
