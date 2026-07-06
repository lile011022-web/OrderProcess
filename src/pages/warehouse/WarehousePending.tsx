import { Camera, ExternalLink, ScanLine } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { Toast } from "../../components/Toast";
import { UploadBox } from "../../components/UploadBox";
import { openTracking } from "../../data/carrierConfig";
import { packages } from "../../data/mockData";
import type { PackageItem } from "../../types";
import { apiRequest } from "../../utils/api";
import { dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function WarehousePending() {
  const [selected, setSelected] = useState<PackageItem | null>(null);
  const [etaSelected, setEtaSelected] = useState<PackageItem | null>(null);
  const [etaValue, setEtaValue] = useState("");
  const [etaNote, setEtaNote] = useState("");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const { data: packageRows, loading, error, setData } = useApiList<PackageItem>("/api/packages", packages);
  const data = packageRows
    .filter((item) => item.status !== "已收货")
    .filter((item) => !query.trim() || item.trackingNo.toLowerCase().includes(query.trim().toLowerCase()));

  async function confirmReceived(item: PackageItem) {
    try {
      const result = await apiRequest<{ data: PackageItem; message: string }>(`/api/packages/${item.id}/confirm-received`, { method: "POST" });
      setData((rows) => rows.map((row) => row.id === item.id ? result.data : row));
      setSelected(null);
      setToast(result.message);
    } catch (confirmError) {
      setToast(confirmError instanceof Error ? confirmError.message : "确认收货失败");
    } finally {
      setTimeout(() => setToast(""), 2200);
    }
  }

  async function saveEta(item: PackageItem) {
    try {
      const result = await apiRequest<{ data: PackageItem; message: string }>(`/api/packages/${item.id}/eta`, {
        method: "POST",
        body: JSON.stringify({ expectedAt: etaValue || item.expectedAt, note: etaNote }),
      });
      setData((rows) => rows.map((row) => row.id === item.id ? result.data : row));
      setEtaSelected(null);
      setToast(result.message);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "保存预计时间失败");
    } finally {
      setTimeout(() => setToast(""), 2200);
    }
  }

  async function markMissing(item: PackageItem) {
    try {
      const result = await apiRequest<{ data: PackageItem; message: string }>(`/api/packages/${item.id}/mark-exception`, {
        method: "POST",
        body: JSON.stringify({ reason: "仓库登记未收到包裹", owner: item.buyer, amount: item.paidPendingConfirmAmount, resolution: "next_credit" }),
      });
      setData((rows) => rows.map((row) => row.id === item.id ? result.data : row));
      setToast(result.message);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "登记未收到失败");
    } finally {
      setTimeout(() => setToast(""), 2200);
    }
  }

  function searchPackage() {
    const keyword = query.trim();
    if (!keyword) {
      setToast("请输入或扫描运单号后再搜索");
    } else {
      setToast(data.length ? `已匹配 ${data.length} 个待确认包裹` : `没有找到运单号包含 ${keyword} 的待确认包裹`);
    }
    setTimeout(() => setToast(""), 2200);
  }

  function openPhotoUpload(item: PackageItem) {
    setSelected(item);
    setToast("已打开包裹确认与照片上传窗口");
    setTimeout(() => setToast(""), 2200);
  }

  return (
    <div>
      <PageHeader title="待确认包裹" desc={error || (loading ? "正在从后端加载待确认包裹..." : "仓库扫描或输入运单号，确认包裹收到状态与实收数量。")} />
      <div className="panel mb-5 flex items-center gap-3 p-4">
        <ScanLine size={24} className="text-slate-500" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-14 flex-1 bg-transparent text-2xl font-black outline-none placeholder:text-slate-300" placeholder="扫描或输入运单号..." />
        <button className="primary-btn" onClick={searchPackage}>搜索包裹</button>
      </div>
      <DataTable
        data={data}
        columns={[
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "carrier", title: "快递公司", render: (row) => row.carrier },
          { key: "eta", title: "预计到达", render: (row) => <div><p>{dateText(row.expectedAt)}</p><button className="mt-1 text-xs font-black text-sky-700" onClick={() => { setEtaSelected(row); setEtaValue(row.expectedAt?.slice(0, 16) || ""); setEtaNote(""); }}>仓库更新</button></div> },
          { key: "overdue", title: "是否超时", render: (row) => <StatusBadge>{row.overdue ? "超时" : "正常"}</StatusBadge> },
          { key: "product", title: "商品摘要", render: (row) => row.product },
          { key: "qty", title: "应收数量", render: (row) => row.productQty },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "warehouse", title: "仓库", render: (row) => row.warehouse },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="primary-btn py-2" onClick={() => setSelected(row)}>确认收到</button><button className="ghost-btn" onClick={() => markMissing(row)}>未收到</button><button className="ghost-btn p-2" title="打开快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}><ExternalLink size={16} /></button><button className="ghost-btn p-2" title="上传包裹照片" onClick={() => openPhotoUpload(row)}><Camera size={16} /></button></div> },
        ]}
      />
      <Modal open={!!etaSelected} title="填写预计送达时间" onClose={() => setEtaSelected(null)}>
        {etaSelected && <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-400">运单号</p>
            <p className="mt-2 font-black text-ink">{etaSelected.trackingNo}</p>
          </div>
          <Input label="预计送达时间" type="datetime-local" value={etaValue} onChange={(event) => setEtaValue(event.currentTarget.value)} />
          <textarea value={etaNote} onChange={(event) => setEtaNote(event.target.value)} className="soft-input min-h-24 w-full p-4" placeholder="官网查询结果或仓库备注" />
          <button className="primary-btn w-full" onClick={() => saveEta(etaSelected)}>保存预计时间</button>
        </div>}
      </Modal>
      <Modal open={!!selected} title="确认收到包裹" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4 font-black text-ink">{selected.trackingNo}</div>
          <div className="grid grid-cols-2 gap-4">
            <label className="rounded-3xl bg-slate-50 p-4 font-bold"><input type="radio" name="received" defaultChecked className="mr-2 accent-slate-900" />收到</label>
            <label className="rounded-3xl bg-slate-50 p-4 font-bold"><input type="radio" name="received" className="mr-2 accent-slate-900" />未收到</label>
            <Input label="实际收到时间" type="datetime-local" />
            <Input label="实收数量" type="number" placeholder={String(selected.productQty)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <UploadBox label="包裹照片" />
            <UploadBox label="商品照片" />
            <UploadBox label="异常照片" />
          </div>
          <textarea className="soft-input min-h-24 w-full p-4" placeholder="收货备注" />
          <button className="primary-btn w-full" onClick={() => confirmReceived(selected)}>提交确认</button>
        </div>}
      </Modal>
      <Toast message={toast} />
    </div>
  );
}

function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input {...props} className="soft-input h-12 w-full px-4" /></label>;
}
