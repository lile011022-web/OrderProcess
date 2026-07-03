const colorMap: Record<string, string> = {
  正常: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  已完成: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  已收货: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  已付款: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  已确认入库: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  已收款: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  待处理: "bg-sky-50 text-sky-700 ring-sky-100",
  待确认: "bg-sky-50 text-sky-700 ring-sky-100",
  处理中: "bg-sky-50 text-sky-700 ring-sky-100",
  接单中: "bg-sky-50 text-sky-700 ring-sky-100",
  已发布: "bg-sky-50 text-sky-700 ring-sky-100",
  在途: "bg-sky-50 text-sky-700 ring-sky-100",
  超时: "bg-orange-50 text-orange-700 ring-orange-100",
  预警: "bg-orange-50 text-orange-700 ring-orange-100",
  预计到达超时: "bg-orange-50 text-orange-700 ring-orange-100",
  异常: "bg-rose-50 text-rose-700 ring-rose-100",
  空包: "bg-rose-50 text-rose-700 ring-rose-100",
  丢失: "bg-rose-50 text-rose-700 ring-rose-100",
  物流异常: "bg-rose-50 text-rose-700 ring-rose-100",
  暂停: "bg-slate-100 text-slate-600 ring-slate-200",
  关闭: "bg-slate-100 text-slate-600 ring-slate-200",
  待付款: "bg-violet-50 text-violet-700 ring-violet-100",
  待收款: "bg-violet-50 text-violet-700 ring-violet-100",
  待抵扣: "bg-violet-50 text-violet-700 ring-violet-100",
  已付待确认: "bg-violet-50 text-violet-700 ring-violet-100",
  已收待确认: "bg-violet-50 text-violet-700 ring-violet-100",
  退款: "bg-orange-50 text-orange-700 ring-orange-100",
  下次抵扣: "bg-violet-50 text-violet-700 ring-violet-100",
};

export function StatusBadge({ children }: { children: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${colorMap[children] ?? "bg-slate-50 text-slate-600 ring-slate-100"}`}>{children}</span>;
}
