import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm">
      <aside className="absolute right-4 top-4 h-[calc(100vh-2rem)] w-[520px] overflow-auto rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-ink">{title}</h2>
          <button className="ghost-btn grid h-10 w-10 place-items-center p-0" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </div>
        {children}
      </aside>
    </div>
  );
}
