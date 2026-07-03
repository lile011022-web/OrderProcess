import { Calculator } from "lucide-react";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { reconciliationRecords } from "../../data/mockData";
import type { ReconciliationRecord } from "../../types";
import { currency } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

const rows = [
  { product: "2024 Bowman Chrome Hobby Box", qty: 26, inbound: 43108, warehouse: 782, shipping: 4200, status: "待确认" },
  { product: "2023-24 Prizm Basketball Mega", qty: 88, inbound: 83160, warehouse: 1280, shipping: 7600, status: "已完成" },
  { product: "Topps Chrome Sapphire Soccer", qty: 50, inbound: 62400, warehouse: 920, shipping: 5100, status: "已完成" },
];

export function Costing() {
  const { data: records, loading, error } = useApiList<ReconciliationRecord>("/api/reconciliation", reconciliationRecords);
  return (
    <div>
      <PageHeader title="成本核算" desc={error || (loading ? "正在从后端加载对账数据..." : "付款后不是最终成本，仓库确认收到后才转为实际入库采购成本。")} actions={<button className="primary-btn flex items-center gap-2"><Calculator size={18} />重新分摊</button>} />
      <div className="panel mb-5 p-5">
        <h2 className="text-lg font-black text-ink">付款与入库成本确认</h2>
        <p className="mt-2 text-sm font-bold text-slate-500">买手或管理员付款后先进入已付待确认金额，只有仓库确认实际收到后才转为实际入库成本；异常金额单独列示，不混入正常成本。</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-black text-ink">{record.period} 对账</p>
                <StatusBadge>{record.status}</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm font-bold">
                <span>已付待确认：{currency(record.paidPendingConfirmAmount)}</span>
                <span>实际入库成本：{currency(record.inboundCost)}</span>
                <span>异常金额：{currency(record.exceptionAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DataTable
        data={rows}
        columns={[
          { key: "product", title: "商品名称", render: (row) => row.product },
          { key: "qty", title: "有效入库数量", render: (row) => row.qty },
          { key: "inbound", title: "实际入库采购成本", render: (row) => currency(row.inbound) },
          { key: "warehouse", title: "分摊仓库操作费", render: (row) => currency(row.warehouse) },
          { key: "shipping", title: "分摊运费清关费", render: (row) => currency(row.shipping) },
          { key: "total", title: "最终总成本", render: (row) => currency(row.inbound + row.warehouse + row.shipping) },
          { key: "unit", title: "单件最终成本", render: (row) => currency((row.inbound + row.warehouse + row.shipping) / row.qty) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: () => <div className="flex gap-2"><button className="ghost-btn">查看明细</button><button className="primary-btn py-2">重新分摊</button></div> },
        ]}
      />
    </div>
  );
}
