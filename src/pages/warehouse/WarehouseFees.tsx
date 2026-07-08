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

type WarehouseFeeRow = (typeof rows)[number];

type SettlementBill = {
  billNo: string;
  row: WarehouseFeeRow;
  generatedAt: string;
};

export function WarehouseFees() {
  const total = calcWarehouseFee(39, 85);
  const [selected, setSelected] = useState<WarehouseFeeRow | null>(null);
  const [bill, setBill] = useState<SettlementBill | null>(null);
  const [generatedBills, setGeneratedBills] = useState<Record<string, SettlementBill>>({});
  const [message, setMessage] = useState("");

  function rowKey(row: WarehouseFeeRow) {
    return `${row.date}-${row.warehouse}`;
  }

  function generateBill(row: WarehouseFeeRow) {
    const key = rowKey(row);
    const currentBill = generatedBills[key] ?? {
      billNo: `WHF-${row.date.replace(/-/g, "")}-${row.warehouse.includes("洛杉矶") ? "LA" : row.warehouse.includes("纽约") ? "NY" : "OR"}`,
      row,
      generatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    };
    setGeneratedBills((current) => ({ ...current, [key]: currentBill }));
    setBill(currentBill);
    setMessage(`${row.warehouse} ${row.date} 结算单已生成：${currentBill.billNo}，金额 ${currency(calcWarehouseFee(row.packages, row.photos).cnyTotal)}`);
  }

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
          { key: "status", title: "状态", render: (row) => <StatusBadge>{generatedBills[rowKey(row)] ? "已生成" : row.status}</StatusBadge> },
          {
            key: "actions",
            title: "操作",
            render: (row) => (
              <div className="flex gap-2">
                <button className="ghost-btn" onClick={() => setSelected(row)}>查看明细</button>
                <button className="primary-btn py-2" onClick={() => generateBill(row)}>
                  {generatedBills[rowKey(row)] ? "查看结算单" : "生成结算单"}
                </button>
              </div>
            ),
          },
        ]}
      />
      <Modal open={!!selected} title="仓库费用明细" onClose={() => setSelected(null)}>
        {selected && <WarehouseFeeDetail row={selected} bill={generatedBills[rowKey(selected)]} />}
      </Modal>
      <Modal open={!!bill} title="仓库操作费结算单" onClose={() => setBill(null)}>
        {bill && <SettlementBillDetail bill={bill} />}
      </Modal>
    </div>
  );
}

function WarehouseFeeDetail({ row, bill }: { row: WarehouseFeeRow; bill?: SettlementBill }) {
  const fee = calcWarehouseFee(row.packages, row.photos);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <p className="text-lg font-black text-ink">{row.warehouse}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">费用日期：{row.date}</p>
        </div>
        <StatusBadge>{bill ? "已生成" : row.status}</StatusBadge>
      </div>
      <FeeBreakdown row={row} />
      <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-700">
        <DetailLine label="包裹操作费规则" value={`5 美元 / 包 × ${row.packages} = ${usd(fee.packageFee)}`} />
        <DetailLine label="拍照费规则" value={`0.5 美元 / 张 × ${row.photos} = ${usd(fee.photoFee)}`} />
        <DetailLine label="固定汇率" value={`1 美元 = ${fee.exchangeRate} 人民币`} />
        <DetailLine label="结算单号" value={bill?.billNo ?? "尚未生成"} />
      </div>
    </div>
  );
}

function SettlementBillDetail({ bill }: { bill: SettlementBill }) {
  const fee = calcWarehouseFee(bill.row.packages, bill.row.photos);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
        <p className="text-xs font-black text-slate-300">结算单号</p>
        <p className="mt-1 text-2xl font-black">{bill.billNo}</p>
        <p className="mt-2 text-sm font-bold text-slate-300">生成时间：{bill.generatedAt}</p>
      </div>
      <FeeBreakdown row={bill.row} />
      <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-700">
        <DetailLine label="仓库" value={bill.row.warehouse} />
        <DetailLine label="费用日期" value={bill.row.date} />
        <DetailLine label="包裹数量" value={`${bill.row.packages} 包`} />
        <DetailLine label="照片数量" value={`${bill.row.photos} 张`} />
        <DetailLine label="美元合计" value={usd(fee.usdTotal)} />
        <DetailLine label="人民币合计" value={currency(fee.cnyTotal)} />
      </div>
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        结算单已生成，金额进入仓库费用待付款流程；费用仍按集中规则计算。
      </div>
    </div>
  );
}

function FeeBreakdown({ row }: { row: WarehouseFeeRow }) {
  const fee = calcWarehouseFee(row.packages, row.photos);

  return (
    <div className="grid grid-cols-4 gap-3">
      <AmountTile label="包裹费" value={usd(fee.packageFee)} />
      <AmountTile label="拍照费" value={usd(fee.photoFee)} />
      <AmountTile label="美元合计" value={usd(fee.usdTotal)} />
      <AmountTile label="人民币合计" value={currency(fee.cnyTotal)} />
    </div>
  );
}

function AmountTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sky-800">
      <p className="text-xs font-black opacity-70">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-slate-700">{value}</p>
    </div>
  );
}
