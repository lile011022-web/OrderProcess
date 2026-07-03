import { ClipboardList, Copy, Eye, Pause, Pencil, Square } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Drawer } from "../../components/Drawer";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { tasks } from "../../data/mockData";
import type { PurchaseTask } from "../../types";
import { currency, dateText } from "../../utils/format";

export function PurchaseTasks() {
  const [selected, setSelected] = useState<PurchaseTask | null>(null);
  return (
    <div>
      <PageHeader title="采购任务列表" desc="查看采购任务进度、接单进度、到仓进度与超时状态。" />
      <FilterBar placeholder="搜索任务编号、商品名称">
        <SelectFilter label="任务状态" options={["草稿", "已发布", "接单中", "已完成", "已暂停"]} />
        <SelectFilter label="买手" options={["Alex Chen", "Mia Wong", "Chris Lee"]} />
        <SelectFilter label="截止时间" options={["今天", "本周", "本月"]} />
        <SelectFilter label="是否超时" options={["是", "否"]} />
      </FilterBar>
      <div className="mb-5 grid grid-cols-4 gap-5">
        <StatCard title="已发布任务" value="18" icon={ClipboardList} tone="sky" />
        <StatCard title="接单中任务" value="12" icon={ClipboardList} tone="violet" />
        <StatCard title="已完成任务" value="31" icon={ClipboardList} tone="green" />
        <StatCard title="超时任务" value="4" icon={ClipboardList} tone="orange" />
      </div>
      <DataTable
        data={tasks}
        columns={[
          { key: "id", title: "任务编号", render: (row) => <button onClick={() => setSelected(row)} className="font-black text-sky-700">{row.id}</button> },
          { key: "source", title: "来源", render: (row) => <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{row.source}</span> },
          { key: "requester", title: "发布人", render: (row) => row.requester },
          { key: "name", title: "商品名称", render: (row) => row.productName },
          { key: "price", title: "目标单价", render: (row) => currency(row.targetPrice) },
          { key: "qty", title: "采购数量", render: (row) => row.quantity },
          { key: "accepted", title: "已接数量", render: (row) => row.accepted },
          { key: "purchased", title: "已采购", render: (row) => row.purchased },
          { key: "arrived", title: "已到仓", render: (row) => row.arrived },
          { key: "left", title: "剩余", render: (row) => row.quantity - row.purchased },
          { key: "deadline", title: "截止时间", render: (row) => dateText(row.deadline) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "overdue", title: "是否超时", render: (row) => <StatusBadge>{row.overdue ? "超时" : "正常"}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button onClick={() => setSelected(row)} className="ghost-btn p-2"><Eye size={16} /></button><button className="ghost-btn p-2"><Pencil size={16} /></button><button className="ghost-btn p-2"><Pause size={16} /></button><button className="ghost-btn p-2"><Square size={16} /></button><button className="ghost-btn p-2"><Copy size={16} /></button></div> },
        ]}
      />
      <Drawer open={!!selected} title="采购任务详情" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-5">
          <img src={selected.image} className="h-52 w-full rounded-3xl object-cover" alt={selected.productName} />
          <div className="grid grid-cols-2 gap-3">
            <Info label="任务编号" value={selected.id} />
            <Info label="来源" value={selected.source} />
            <Info label="发布人" value={selected.requester} />
            <Info label="状态" value={selected.status} />
            <Info label="目标单价" value={currency(selected.targetPrice)} />
            <Info label="预计预算" value={currency(selected.targetPrice * selected.quantity)} />
            <Info label="采购数量" value={String(selected.quantity)} />
            <Info label="已到仓数量" value={String(selected.arrived)} />
            <Info label="收货仓库" value={selected.warehouse} />
            <Info label="收货人" value={selected.recipient} />
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-500">采购要求</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{selected.requirement}</p>
          </div>
        </div>}
      </Drawer>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-2 font-black text-ink">{value}</p></div>;
}
