import { WalletCards } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { currency } from "../../utils/format";

const ledger = [
  { date: "2026-07-02", type: "付款", order: "BF-240701-018", product: "Bowman Chrome", amount: 26160, change: -26160, status: "已付待确认", note: "扣抵 1800 后付款" },
  { date: "2026-07-01", type: "异常生成", order: "BF-240630-011", product: "Select NFL", amount: 5600, change: 5600, status: "待抵扣", note: "物流异常，等待退款" },
  { date: "2026-06-30", type: "正常结清", order: "BF-240628-004", product: "Topps Chrome", amount: 13320, change: 0, status: "已完成", note: "仓库确认收到" },
];

export function BuyerLedger() {
  const [selected, setSelected] = useState<(typeof ledger)[number] | null>(null);
  return (
    <div>
      <PageHeader title="买手往来账" desc="以买手维度追踪付款、退款、抵扣、异常生成与结清。" />
      <FilterBar><SelectFilter label="买手" options={["Alex Chen", "Mia Wong", "Chris Lee"]} /><SelectFilter label="时间范围" options={["本周", "本月", "本季度"]} /></FilterBar>
      <div className="mb-5 grid grid-cols-7 gap-4">
        {[
          ["累计应付金额", 286900],
          ["累计已付金额", 224800],
          ["已付待确认金额", 84960],
          ["正常结清金额", 172300],
          ["异常金额", 18600],
          ["待抵扣金额", 11800],
          ["当前余额", 39800],
        ].map(([title, value]) => <StatCard key={title} title={String(title)} value={currency(Number(value))} icon={WalletCards} tone="violet" />)}
      </div>
      <DataTable
        data={ledger}
        columns={[
          { key: "date", title: "日期", render: (row) => row.date },
          { key: "type", title: "类型", render: (row) => row.type },
          { key: "order", title: "关联采购单", render: (row) => row.order },
          { key: "product", title: "商品", render: (row) => row.product },
          { key: "amount", title: "金额", render: (row) => currency(row.amount) },
          { key: "change", title: "余额变化", render: (row) => currency(row.change) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "note", title: "备注", render: (row) => row.note },
          { key: "actions", title: "操作", render: (row) => <button className="ghost-btn" onClick={() => setSelected(row)}>查看</button> },
        ]}
      />
      <Modal open={!!selected} title="往来账明细" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-3">
          <p className="font-black text-ink">{selected.order} / {selected.product}</p>
          <p>类型：{selected.type}</p>
          <p>金额：{currency(selected.amount)}</p>
          <p>余额变化：{currency(selected.change)}</p>
          <p>备注：{selected.note}</p>
        </div>}
      </Modal>
    </div>
  );
}
