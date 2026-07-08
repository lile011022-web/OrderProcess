import { ExternalLink, Eye } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Drawer } from "../../components/Drawer";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { fillRecords } from "../../data/mockData";
import type { BuyerFillRecord } from "../../types";
import { openTrackingByNumber } from "../../data/carrierConfig";
import { getCurrentUser } from "../../utils/auth";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function PurchaseOrders() {
  const user = getCurrentUser();
  const isBuyer = user?.role === "buyer";
  const endpoint = isBuyer ? `/api/buyer-fill-records?buyer=${encodeURIComponent(user.displayName)}` : "/api/buyer-fill-records";
  const fallback = isBuyer ? fillRecords.filter((record) => record.buyer === user.displayName) : fillRecords;
  const { data, loading, error } = useApiList<BuyerFillRecord>(endpoint, fallback);
  const [selected, setSelected] = useState<BuyerFillRecord | null>(null);

  return (
    <div>
      <PageHeader title={isBuyer ? "我的接单" : "接单记录"} desc={error || (loading ? "正在从后端加载接单记录..." : "查看买手接单、回填、审核、付款和物流状态。")} />
      <FilterBar placeholder="搜索接单编号、商品、运单号">
        <SelectFilter label="审核状态" options={["待回填", "待审核", "已审核", "已驳回"]} />
        <SelectFilter label="付款状态" options={["待付款", "已付待确认", "已付款"]} />
      </FilterBar>
      <DataTable
        data={data}
        columns={[
          { key: "orderId", title: "接单编号", render: (row) => <button className="font-black text-sky-700" onClick={() => setSelected(row)}>{row.orderId}</button> },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "product", title: "商品", render: (row) => row.productName },
          { key: "qty", title: "数量", render: (row) => row.quantity },
          { key: "unitPrice", title: "采购单价", render: (row) => currency(row.unitPrice) },
          { key: "settlement", title: "结算金额", render: (row) => currency(row.settlement) },
          { key: "tracking", title: "运单号", render: (row) => row.trackingNo ? <button className="font-black text-sky-700" onClick={() => openTrackingByNumber(row.trackingNo)}>{row.trackingNo}</button> : "待回填" },
          { key: "warehouse", title: "仓库", render: (row) => row.warehouse || "未指定" },
          { key: "audit", title: "审核", render: (row) => <StatusBadge>{row.auditStatus}</StatusBadge> },
          { key: "pay", title: "付款", render: (row) => <StatusBadge>{isBuyer ? row.payStatus.replace(/付款/g, "收款").replace(/已付/g, "已收") : row.payStatus}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn p-2" title="查看详情" onClick={() => setSelected(row)}><Eye size={16} /></button><button className="ghost-btn p-2" title="官网查询" disabled={!row.trackingNo} onClick={() => openTrackingByNumber(row.trackingNo)}><ExternalLink size={16} /></button></div> },
        ]}
      />
      <Drawer open={!!selected} title="接单详情" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-4">
          <Info label="接单编号" value={selected.orderId} />
          <Info label="商品" value={selected.productName} />
          <Info label="买手" value={selected.buyer} />
          <Info label="数量 / 单价" value={`${selected.quantity} / ${currency(selected.unitPrice)}`} />
          <Info label="结算金额" value={currency(selected.settlement)} />
          <Info label="运单号" value={selected.trackingNo || "待回填"} />
          <Info label="收货仓库" value={selected.warehouse || "未指定"} />
          <Info label="收货人" value={selected.recipient || "未填写"} />
          <Info label="预计到仓" value={selected.warehouseEta ? dateText(selected.warehouseEta) : "待仓库维护"} />
          <Info label="审核状态" value={selected.auditStatus} />
          <Info label={isBuyer ? "收款状态" : "付款状态"} value={isBuyer ? selected.payStatus.replace(/付款/g, "收款").replace(/已付/g, "已收") : selected.payStatus} />
        </div>}
      </Drawer>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-2 font-black text-ink">{value}</p></div>;
}
