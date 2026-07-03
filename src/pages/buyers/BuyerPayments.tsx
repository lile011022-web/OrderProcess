import { ExternalLink } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { Toast } from "../../components/Toast";
import { UploadBox } from "../../components/UploadBox";
import { fillRecords } from "../../data/mockData";
import type { BuyerFillRecord } from "../../types";
import { inferCarrier, openTrackingByNumber } from "../../data/carrierConfig";
import { getCurrentUser } from "../../utils/auth";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function BuyerPayments() {
  const [selected, setSelected] = useState<BuyerFillRecord | null>(null);
  const [toast, setToast] = useState("");
  const user = getCurrentUser();
  const endpoint = user?.role === "buyer" ? `/api/buyer-fill-records?buyer=${encodeURIComponent(user.displayName)}` : "/api/buyer-fill-records";
  const { data: apiRecords, loading, error } = useApiList<BuyerFillRecord>(endpoint, user?.role === "buyer" ? fillRecords.filter((record) => record.buyer === user.displayName) : fillRecords);
  const visibleRecords = user?.role === "buyer" ? apiRecords.filter((record) => record.buyer === user.displayName) : apiRecords;
  const isBuyer = user?.role === "buyer";
  const paymentWord = isBuyer ? "收款" : "付款";
  const statusText = (value: string) => isBuyer ? value.replace(/付款/g, "收款").replace(/已付/g, "已收") : value;
  return (
    <div>
      <PageHeader title={isBuyer ? "买手收款" : "买手付款"} desc={error || (loading ? "正在从后端加载付款记录..." : isBuyer ? "查看采购回填对应的应收、已收与待确认状态。" : "审核买手回填记录，扣减异常待抵扣金额后完成付款。")} />
      <FilterBar><SelectFilter label={`${paymentWord}状态`} options={isBuyer ? ["待收款", "已收款", "已收待确认"] : ["待付款", "已付款", "已付待确认"]} /><SelectFilter label="审核状态" options={["待审核", "已审核", "已驳回"]} /></FilterBar>
      <DataTable
        data={visibleRecords}
        columns={[
          { key: "id", title: "回填编号", render: (row) => row.id },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "product", title: "商品名称", render: (row) => row.productName },
          { key: "qty", title: "采购数量", render: (row) => row.quantity },
          { key: "settlement", title: "结算金额", render: (row) => currency(row.settlement) },
          { key: "payQty", title: `${paymentWord}数量`, render: (row) => `${row.quantity} / ${row.quantity}` },
          { key: "over", title: "是否超价", render: (row) => <StatusBadge>{row.overPrice ? "预警" : "正常"}</StatusBadge> },
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTrackingByNumber(row.trackingNo)}>{row.trackingNo}</button> },
          { key: "carrier", title: "快递识别", render: (row) => inferCarrier(row.trackingNo) ?? "待识别" },
          { key: "eta", title: "仓库预计到达", render: (row) => row.warehouseEta ? dateText(row.warehouseEta) : "待仓库填写" },
          { key: "audit", title: "审核状态", render: (row) => <StatusBadge>{row.auditStatus}</StatusBadge> },
          { key: "pay", title: `${paymentWord}状态`, render: (row) => <StatusBadge>{statusText(row.payStatus)}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn">审核</button><button className="primary-btn py-2" onClick={() => setSelected(row)}>{paymentWord}</button><button className="ghost-btn">驳回</button><button className="ghost-btn p-2" title="打开快递官网查询" onClick={() => openTrackingByNumber(row.trackingNo)}><ExternalLink size={16} /></button></div> },
        ]}
      />
      <Modal open={!!selected} title={`${paymentWord}处理`} onClose={() => setSelected(null)}>
        {selected && <PaymentForm record={selected} paymentWord={paymentWord} onDone={() => { setSelected(null); setToast(`${paymentWord}已记录，状态进入${isBuyer ? "已收待确认" : "已付待确认"}`); setTimeout(() => setToast(""), 2200); }} />}
      </Modal>
      <Toast message={toast} />
    </div>
  );
}

function PaymentForm({ record, paymentWord, onDone }: { record: BuyerFillRecord; paymentWord: string; onDone: () => void }) {
  const [payQty, setPayQty] = useState(record.quantity);
  const deduction = 1800;
  const quantityRatio = Math.min(Math.max(payQty, 0), record.quantity) / record.quantity;
  const payable = Math.round(record.settlement * quantityRatio);
  return <div className="space-y-4">
    <div className="rounded-3xl bg-sky-50 p-4">
      <p className="text-sm font-black text-sky-900">按采购数量{paymentWord}</p>
      <p className="mt-1 text-sm font-bold text-sky-700">可全选{paymentWord}，也可以只选择本次需要{paymentWord}的数量；未{paymentWord}数量继续保留待处理。</p>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <PayMetric label="买手" value={record.buyer} />
      <PayMetric label="应付金额" value={currency(record.settlement)} />
      <Input label={`本次${paymentWord}数量`} type="number" min={0} max={record.quantity} value={payQty} onChange={(event) => setPayQty(Number(event.currentTarget.value))} />
      <button type="button" className="ghost-btn self-end" onClick={() => setPayQty(record.quantity)}>全选{paymentWord}</button>
      <PayMetric label="历史待抵扣金额" value={currency(3600)} />
      <PayMetric label="本次抵扣金额" value={currency(deduction)} />
      <PayMetric label={`本次实际${paymentWord}`} value={currency(Math.max(payable - deduction, 0))} highlight />
      <Input label={`${paymentWord}方式`} placeholder="银行转账 / Wise / PayPal" />
      <Input label={`${paymentWord}账户`} placeholder="招商银行 8888" />
      <Input label={`${paymentWord}时间`} type="datetime-local" />
    </div>
    <UploadBox label={`${paymentWord}截图上传`} />
    <textarea className="soft-input min-h-24 w-full p-4" placeholder={`${paymentWord}备注`} />
    <button className="primary-btn w-full" onClick={onDone}>确认{paymentWord}</button>
  </div>;
}

function PayMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-3xl p-4 ${highlight ? "bg-emerald-50" : "bg-slate-50"}`}><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-2 font-black text-ink">{value}</p></div>;
}

function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input {...props} className="soft-input h-12 w-full px-4" /></label>;
}
