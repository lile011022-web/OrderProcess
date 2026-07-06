import { Receipt } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { calcWarehouseFee, USD_CNY_RATE } from "../../utils/cost";
import { currency, usd } from "../../utils/format";

const rows = [
  { date: "2026-07-02", warehouse: "洛杉矶一号仓", packages: 18, photos: 42, status: "待确认" },
  { date: "2026-07-01", warehouse: "纽约中转仓", packages: 9, photos: 18, status: "已完成" },
  { date: "2026-06-30", warehouse: "俄勒冈免税仓", packages: 12, photos: 25, status: "待付款" },
];

export function WarehouseFees() {
  const total = calcWarehouseFee(39, 85);
  const [selected, setSelected] = useState<(typeof rows)[number] | null>(null);
  const [message, setMessage] = useState("");
  return (
    <div>
      <PageHeader title="仓库操作费" desc={message || "包裹接收费 5 美元 / 包，拍照费 0.5 美元 / 张，固定汇率 6.8。"} />
      <div className="mb-5 grid grid-cols-8 gap-4">
        <StatCard title="收到包裹数" value="39" icon={Receipt} />
        <StatCard title="照片数量" value="85" icon={Receipt} />
        <StatCard title="包裹费美元" value={usd(total.packageFee)} icon={Receipt} tone="green" />
        <StatCard title="拍照费美元" value={usd(total.photoFee)} icon={Receipt} tone="green" />
        <StatCard title="美元合计" value={usd(total.usdTotal)} icon={Receipt} tone="violet" />
        <StatCard title="人民币合计" value={currency(total.cnyTotal)} icon={Receipt} tone="violet" />
        <StatCard title="未结算金额" value={currency(940.1)} icon={Receipt} tone="orange" />
        <StatCard title="已结算金额" value={currency(6749.9)} icon={Receipt} tone="sky" />
      </div>
      <DataTable
        data={rows}
        columns={[
          { key: "date", title: "日期", render: (row) => row.date },
          { key: "warehouse", title: "仓库", render: (row) => row.warehouse },
          { key: "packages", title: "包裹数量", render: (row) => row.packages },
          { key: "photos", title: "照片数量", render: (row) => row.photos },
          { key: "packageFee", title: "包裹费", render: (row) => usd(calcWarehouseFee(row.packages, row.photos).packageFee) },
          { key: "photoFee", title: "拍照费", render: (row) => usd(calcWarehouseFee(row.packages, row.photos).photoFee) },
          { key: "usd", title: "美元合计", render: (row) => usd(calcWarehouseFee(row.packages, row.photos).usdTotal) },
          { key: "rate", title: "汇率", render: () => USD_CNY_RATE },
          { key: "cny", title: "人民币合计", render: (row) => currency(calcWarehouseFee(row.packages, row.photos).cnyTotal) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => setSelected(row)}>查看明细</button><button className="primary-btn py-2" onClick={() => setMessage(`${row.warehouse} ${row.date} 结算单已生成：${currency(calcWarehouseFee(row.packages, row.photos).cnyTotal)}`)}>生成结算单</button></div> },
        ]}
      />
      <Modal open={!!selected} title="仓库费用明细" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-3">
          <p className="font-black text-ink">{selected.warehouse} / {selected.date}</p>
          <p>包裹数量：{selected.packages}</p>
          <p>照片数量：{selected.photos}</p>
          <p>美元合计：{usd(calcWarehouseFee(selected.packages, selected.photos).usdTotal)}</p>
          <p>人民币合计：{currency(calcWarehouseFee(selected.packages, selected.photos).cnyTotal)}</p>
        </div>}
      </Modal>
    </div>
  );
}
