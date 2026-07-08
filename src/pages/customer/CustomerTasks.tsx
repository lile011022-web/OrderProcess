import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../components/DataTable";
import { Drawer } from "../../components/Drawer";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { Modal } from "../../components/Modal";
import { Toast } from "../../components/Toast";
import { tasks } from "../../data/mockData";
import type { PurchaseTask } from "../../types";
import { createRecordApi, deleteRecordApi, updateRecordApi } from "../../utils/api";
import { requireCurrentUser } from "../../utils/auth";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function CustomerTasks() {
  const user = requireCurrentUser();
  const [selected, setSelected] = useState<PurchaseTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseTask | null>(null);
  const [toast, setToast] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const { data, loading, error, setData } = useApiList<PurchaseTask>(`/api/tasks?role=customer&owner=${encodeURIComponent(user.displayName)}`, tasks.filter((task) => task.requester === user.displayName));
  const published = data.filter((task) => task.status === "已发布").length;
  const accepting = data.filter((task) => task.status === "接单中").length;
  const totalBudget = data.reduce((sum, task) => sum + task.targetPrice * task.quantity, 0);

  async function copyTask(row: PurchaseTask) {
    const result = await createRecordApi<PurchaseTask>("task", { ...row, id: undefined, status: "草稿", accepted: 0, purchased: 0, arrived: 0, buyer: "未分配" });
    setData((rows) => [result.data, ...rows]);
  }

  async function settleTask(row: PurchaseTask) {
    const amount = row.targetPrice * row.quantity;
    const result = await updateRecordApi<PurchaseTask>("task", row.id, {
      customerPayStatus: "已结款",
      customerPaidAmount: amount,
      customerPaidAt: new Date().toISOString(),
    });
    setData((rows) => rows.map((item) => item.id === row.id ? result.data : item));
  }

  async function deleteTask(row: PurchaseTask) {
    setDeletingId(row.id);
    try {
      await deleteRecordApi<PurchaseTask>("task", row.id);
      setData((rows) => rows.filter((item) => item.id !== row.id));
      setDeleteTarget(null);
      setToast(`采购任务 ${row.id} 已删除`);
    } catch (deleteError) {
      setToast(deleteError instanceof Error ? deleteError.message : "删除采购任务失败");
    } finally {
      setDeletingId("");
      setTimeout(() => setToast(""), 2200);
    }
  }

  return (
    <div>
      <PageHeader
        title="我的采购任务"
        desc={error || (loading ? "正在从后端加载我的采购任务..." : "客户发布采购需求后，买手在任务大厅接单；客户可追踪接单、采购和到仓进度。")}
        actions={<Link to="/customer/tasks/new" className="primary-btn flex items-center gap-2"><Plus size={18} />发布采购任务</Link>}
      />
      <div className="mb-5 grid grid-cols-4 gap-5">
        <StatCard title="我的任务数" value={String(data.length)} />
        <StatCard title="已发布任务" value={String(published)} tone="sky" />
        <StatCard title="接单中任务" value={String(accepting)} tone="violet" />
        <StatCard title="预计采购预算" value={currency(totalBudget)} tone="green" />
      </div>
      <FilterBar placeholder="搜索我的任务、商品名称">
        <SelectFilter label="任务状态" options={["已发布", "接单中", "已完成", "超时"]} />
        <SelectFilter label="截止时间" options={["今天", "本周", "本月"]} />
      </FilterBar>
      <DataTable
        data={data}
        columns={[
          { key: "id", title: "任务编号", render: (row) => row.id },
          { key: "product", title: "商品名称", render: (row) => row.productName },
          { key: "price", title: "目标单价", render: (row) => currency(row.targetPrice) },
          { key: "qty", title: "需求数量", render: (row) => row.quantity },
          { key: "accepted", title: "已接数量", render: (row) => row.accepted },
          { key: "purchased", title: "已采购", render: (row) => row.purchased },
          { key: "arrived", title: "已到仓", render: (row) => row.arrived },
          { key: "buyer", title: "当前买手", render: (row) => row.buyer },
          { key: "warehouse", title: "收货仓库", render: (row) => row.warehouse },
          { key: "customerPay", title: "客户结款", render: (row) => <StatusBadge>{row.customerPayStatus || "待结款"}</StatusBadge> },
          { key: "deadline", title: "截止时间", render: (row) => dateText(row.deadline) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex flex-wrap gap-2"><button className="ghost-btn" onClick={() => setSelected(row)}>查看进度</button><button className="ghost-btn" onClick={() => copyTask(row)}>复制再发</button><button className="ghost-btn border-rose-200 text-rose-600" disabled={deletingId === row.id} onClick={() => setDeleteTarget(row)}>{deletingId === row.id ? "删除中" : "删除"}</button><button className="primary-btn py-2" disabled={row.customerPayStatus === "已结款"} onClick={() => settleTask(row)}>{row.customerPayStatus === "已结款" ? "已结款" : "确认结款"}</button></div> },
        ]}
      />
      <Drawer open={!!selected} title="任务进度" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-4">
          <Info label="商品" value={selected.productName} />
          <Info label="已接数量" value={`${selected.accepted} / ${selected.quantity}`} />
          <Info label="已采购" value={`${selected.purchased}`} />
          <Info label="已到仓" value={`${selected.arrived}`} />
          <Info label="当前买手" value={selected.buyer} />
          <Info label="状态" value={selected.status} />
          <Info label="结款状态" value={selected.customerPayStatus || "待结款"} />
          <Info label="结款金额" value={currency(selected.customerPaidAmount || 0)} />
        </div>}
      </Drawer>
      <Modal open={!!deleteTarget} title="删除采购任务" onClose={() => setDeleteTarget(null)}>
        {deleteTarget && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
              删除后，该任务会从“我的采购任务”中移除；已被买手接单或已经产生后续业务的任务，后端权限和业务校验会阻止不该删除的记录。
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-700">
              <Info label="任务编号" value={deleteTarget.id} />
              <Info label="商品" value={deleteTarget.productName} />
              <Info label="状态" value={deleteTarget.status} />
              <Info label="需求数量" value={`${deleteTarget.quantity}`} />
            </div>
            <div className="flex justify-end gap-3">
              <button className="ghost-btn" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="primary-btn bg-rose-600" disabled={deletingId === deleteTarget.id} onClick={() => deleteTask(deleteTarget)}>{deletingId === deleteTarget.id ? "删除中..." : "确认删除"}</button>
            </div>
          </div>
        )}
      </Modal>
      <Toast message={toast} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-2 font-black text-ink">{value}</p></div>;
}
