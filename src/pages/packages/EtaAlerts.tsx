import { BellRing, ExternalLink } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { Toast } from "../../components/Toast";
import { openTracking } from "../../data/carrierConfig";
import { packages } from "../../data/mockData";
import type { PackageItem } from "../../types";
import { apiRequest } from "../../utils/api";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function EtaAlerts() {
  const [toast, setToast] = useState("");
  const { data: rows, setData } = useApiList<PackageItem>("/api/packages?overdue=true", packages.filter((item) => item.overdue));
  const overdue = rows.filter((item) => item.overdue && item.status !== "已收货");

  async function markMissing(row: PackageItem) {
    const result = await apiRequest<{ data: PackageItem; message: string }>(`/api/packages/${row.id}/mark-exception`, {
      method: "POST",
      body: JSON.stringify({ reason: "预计到达超时后标记未收到", amount: row.paidPendingConfirmAmount, resolution: "next_credit" }),
    });
    setData((items) => items.map((item) => item.id === row.id ? result.data : item));
    setToast(result.message);
    setTimeout(() => setToast(""), 2200);
  }

  async function continueWait(row: PackageItem) {
    const result = await apiRequest<{ data: PackageItem; message: string }>(`/api/packages/${row.id}/eta`, {
      method: "POST",
      body: JSON.stringify({ expectedAt: row.expectedAt, note: "提醒后继续等待" }),
    });
    setData((items) => items.map((item) => item.id === row.id ? result.data : item));
    setToast(result.message);
    setTimeout(() => setToast(""), 2200);
  }

  return (
    <div>
      <PageHeader title="预计到达提醒" desc="超过预计到达时间但仓库未确认收到的包裹。" />
      <DataTable
        data={overdue}
        columns={[
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "carrier", title: "快递公司", render: (row) => row.carrier },
          { key: "eta", title: "预计到达", render: (row) => dateText(row.expectedAt) },
          { key: "days", title: "超时天数", render: () => "2 天" },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "product", title: "商品", render: (row) => row.product },
          { key: "paid", title: "已付金额", render: (row) => currency(row.paidAmount) },
          { key: "warehouse", title: "仓库", render: (row) => row.warehouse },
          { key: "state", title: "仓库处理状态", render: () => <StatusBadge>待确认</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn p-2" title="打开快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}><ExternalLink size={16} /></button><button className="ghost-btn flex gap-2" onClick={() => { setToast(`已提醒仓库核查 ${row.trackingNo}`); setTimeout(() => setToast(""), 2200); }}><BellRing size={16} />提醒仓库</button><button className="ghost-btn" onClick={() => markMissing(row)}>标记未收到</button><button className="ghost-btn" onClick={() => continueWait(row)}>继续等待</button></div> },
        ]}
      />
      <Toast message={toast} />
    </div>
  );
}
