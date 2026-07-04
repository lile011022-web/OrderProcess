import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { openTracking } from "../../data/carrierConfig";
import { packageExceptions } from "../../data/mockData";
import type { PackageException } from "../../types";
import { apiRequest } from "../../utils/api";
import { currency, dateText, exceptionResolutionText, exceptionStatusText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function PackageExceptions() {
  const [selected, setSelected] = useState<PackageException | null>(null);
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState<PackageException["resolution"]>("next_credit");
  const { data, loading, error, setData } = useApiList<PackageException>("/api/packages/exceptions", packageExceptions);
  const refundAmount = data.filter((item) => item.resolution === "refund").reduce((sum, item) => sum + item.amount, 0);
  const creditAmount = data.filter((item) => item.resolution === "next_credit").reduce((sum, item) => sum + item.amount, 0);

  async function resolveException(item: PackageException) {
    try {
      const result = await apiRequest<{ data: PackageException; message: string }>(`/api/packages/exceptions/${item.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution, note }),
      });
      setData((rows) => rows.map((row) => row.id === item.id ? result.data : row));
      setSelected(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "保存异常处理失败");
    }
  }

  return (
    <div>
      <PageHeader title="包裹异常" desc={error || (loading ? "正在从后端加载异常记录..." : "记录空包、丢失、少货、错货、物流异常，异常金额不直接进入正常入库成本。")} />
      <div className="mb-5 grid grid-cols-4 gap-5">
        <StatCard title="异常记录" value={String(data.length)} />
        <StatCard title="退款金额" value={currency(refundAmount)} tone="orange" />
        <StatCard title="下次抵扣" value={currency(creditAmount)} tone="violet" />
        <StatCard title="待处理" value={String(data.filter((item) => item.status !== "resolved").length)} tone="sky" />
      </div>
      <FilterBar placeholder="搜索异常编号、运单号、买手">
        <SelectFilter label="处理方式" options={["退款", "下次抵扣"]} />
        <SelectFilter label="处理状态" options={["待处理", "处理中", "已完成"]} />
        <SelectFilter label="责任方" options={["买手", "仓库", "快递公司"]} />
      </FilterBar>
      <DataTable
        data={data}
        columns={[
          { key: "id", title: "异常编号", render: (row) => row.id },
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "product", title: "商品摘要", render: (row) => row.product },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "reason", title: "异常原因", render: (row) => row.reason },
          { key: "owner", title: "责任方/处理人", render: (row) => row.owner },
          { key: "amount", title: "异常金额", render: (row) => currency(row.amount) },
          { key: "resolution", title: "处理方式", render: (row) => <StatusBadge>{exceptionResolutionText[row.resolution]}</StatusBadge> },
          { key: "status", title: "处理状态", render: (row) => <StatusBadge>{exceptionStatusText[row.status]}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="primary-btn py-2" onClick={() => { setSelected(row); setNote(row.note); setResolution(row.resolution); }}>处理</button><button className="ghost-btn p-2" title="官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}><ExternalLink size={16} /></button></div> },
        ]}
      />
      <Modal open={!!selected} title="异常处理" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-black text-ink">{selected.id} / {selected.packageId}</p>
              <p className="mt-2 text-sm font-bold text-slate-600">{selected.reason}</p>
              <p className="mt-2 text-sm font-bold text-slate-500">创建时间：{dateText(selected.createdAt)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Info label="涉及金额" value={currency(selected.amount)} />
              <Info label="处理方式" value={exceptionResolutionText[selected.resolution]} />
              <Info label="责任方/处理人" value={selected.owner} />
              <Info label="凭证信息" value={selected.evidence} />
            </div>
            <select value={resolution} onChange={(event) => setResolution(event.target.value as PackageException["resolution"])} className="soft-input h-12 w-full px-4">
              <option value="refund">退款</option>
              <option value="next_credit">下次抵扣</option>
            </select>
            <textarea className="soft-input min-h-28 w-full p-4" value={note} onChange={(event) => setNote(event.target.value)} />
            <button className="primary-btn w-full" onClick={() => resolveException(selected)}>保存处理结果</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-2 font-black text-ink">{value}</p></div>;
}
