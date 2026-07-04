import { Clock, ShoppingCart } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { Toast } from "../../components/Toast";
import { tasks } from "../../data/mockData";
import type { PurchaseTask } from "../../types";
import { apiRequest } from "../../utils/api";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function TaskHall() {
  const [selected, setSelected] = useState<PurchaseTask | null>(null);
  const [acceptQty, setAcceptQty] = useState(10);
  const [unitPrice, setUnitPrice] = useState(0);
  const [toast, setToast] = useState("");
  const { data, loading, error, setData } = useApiList<PurchaseTask>("/api/tasks", tasks);

  async function acceptTask(task: PurchaseTask) {
    try {
      const result = await apiRequest<{ data: PurchaseTask; message: string }>(`/api/tasks/${task.id}/accept`, {
        method: "POST",
        body: JSON.stringify({ quantity: acceptQty, unitPrice: unitPrice || task.targetPrice }),
      });
      setData((rows) => rows.map((row) => row.id === task.id ? result.data : row));
      setSelected(null);
      setToast(result.message);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "接单失败");
    } finally {
      setTimeout(() => setToast(""), 2200);
    }
  }

  return (
    <div>
      <PageHeader title="任务大厅" desc={error || (loading ? "正在从后端加载任务大厅..." : "买手可查看剩余采购任务并主动接单。")} />
      <div className="grid grid-cols-3 gap-5">
        {data.filter((task) => task.status !== "已完成" && task.quantity - task.accepted > 0).map((task) => (
          <article key={task.id} className="panel overflow-hidden">
            <img src={task.image} alt={task.productName} className="h-44 w-full object-cover" />
            <div className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-lg font-black leading-6 text-ink">{task.productName}</h2>
                <StatusBadge>{task.status}</StatusBadge>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">{task.source}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{task.requester}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="目标单价" value={currency(task.targetPrice)} />
                <Metric label="需求数量" value={`${task.quantity} 件`} />
                <Metric label="剩余可接" value={`${task.quantity - task.accepted} 件`} />
                <Metric label="截止时间" value={dateText(task.deadline)} />
                <Metric label="收货仓库" value={task.warehouse} />
                <Metric label="收货人" value={task.recipient} />
              </div>
              <p className="mt-4 min-h-12 text-sm font-semibold leading-6 text-slate-500">{task.requirement}</p>
              <button onClick={() => { setSelected(task); setAcceptQty(Math.max(1, Math.min(10, task.quantity - task.accepted))); setUnitPrice(task.targetPrice); }} className="primary-btn mt-5 flex w-full items-center justify-center gap-2"><ShoppingCart size={18} />接单</button>
            </div>
          </article>
        ))}
      </div>
      <Modal open={!!selected} title="确认接单" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="font-black text-ink">{selected.productName}</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-500"><Clock size={16} />{dateText(selected.deadline)} 截止</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="接单数量" type="number" min={1} max={selected.quantity - selected.accepted} value={acceptQty} onChange={(event) => setAcceptQty(Number(event.currentTarget.value))} />
            <Input label="预计采购单价" type="number" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.currentTarget.value))} placeholder={String(selected.targetPrice)} />
            <Input label="预计完成时间" type="datetime-local" />
            <Input label="接单备注" placeholder="可备注采购平台或货源" />
          </div>
          <button className="primary-btn w-full" onClick={() => acceptTask(selected)}>确认接单</button>
        </div>}
      </Modal>
      <Toast message={toast} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-1 font-black text-ink">{value}</p></div>;
}

function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input {...props} className="soft-input h-12 w-full px-4" /></label>;
}
