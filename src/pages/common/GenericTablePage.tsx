import { BarChart3, Boxes, ClipboardList } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { fillRecords, packages, tasks } from "../../data/mockData";
import { currency, dateText } from "../../utils/format";
import { openTracking } from "../../data/carrierConfig";
import { downloadReportCsv } from "../../utils/api";

type Variant = "tasks" | "buyers" | "packages" | "finance" | "reports" | "settings";

export function GenericTablePage({ title, desc, variant = "tasks" }: { title: string; desc?: string; variant?: Variant }) {
  const [message, setMessage] = useState("");
  const stats = {
    tasks: [["任务数量", "64"], ["接单记录", "128"], ["超时提醒", "4"]],
    buyers: [["买手数量", "18"], ["本月回填", "86"], ["待抵扣", currency(11800)]],
    packages: [["包裹数量", "42"], ["在途包裹", "38"], ["异常包裹", "3"]],
    finance: [["待结算", currency(84960)], ["已结清", currency(172300)], ["异常金额", currency(18600)]],
    reports: [["统计周期", "本月"], ["采购额", currency(224800)], ["最终成本", currency(196420)]],
    settings: [["基础资料", "56"], ["启用规则", "12"], ["快递公司", "3"]],
  }[variant];

  return (
    <div>
      <PageHeader title={title} desc={message || desc || "业务数据已接入后端，报表页可导出 CSV。"} actions={<button className="primary-btn" onClick={() => downloadReportCsv(variant === "reports" ? "purchase" : variant)}>导出 CSV</button>} />
      <FilterBar>
        <SelectFilter label="状态" options={["待处理", "已完成", "异常", "待付款"]} />
        <SelectFilter label="时间范围" options={["今天", "本周", "本月"]} />
      </FilterBar>
      <div className="mb-5 grid grid-cols-3 gap-5">
        {stats.map(([label, value], index) => <StatCard key={label} title={label} value={value} icon={index === 0 ? ClipboardList : index === 1 ? Boxes : BarChart3} tone={index === 2 ? "orange" : "sky"} />)}
      </div>
      {variant === "packages" ? <PackageRows onAction={setMessage} /> : variant === "buyers" ? <BuyerRows onAction={setMessage} /> : <TaskRows onAction={setMessage} />}
    </div>
  );
}

function TaskRows({ onAction }: { onAction: (message: string) => void }) {
  return <DataTable
    data={tasks}
    columns={[
      { key: "id", title: "编号", render: (row) => row.id },
      { key: "product", title: "商品", render: (row) => row.productName },
      { key: "target", title: "目标单价", render: (row) => currency(row.targetPrice) },
      { key: "qty", title: "数量", render: (row) => row.quantity },
      { key: "deadline", title: "截止时间", render: (row) => dateText(row.deadline) },
      { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
      { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => onAction(`已打开 ${row.id} 的详情摘要`)}>查看</button><button className="ghost-btn" onClick={() => onAction(`${row.id} 已进入可编辑状态`) }>编辑</button></div> },
    ]}
  />;
}

function BuyerRows({ onAction }: { onAction: (message: string) => void }) {
  return <DataTable
    data={fillRecords}
    columns={[
      { key: "id", title: "编号", render: (row) => row.id },
      { key: "buyer", title: "买手", render: (row) => row.buyer },
      { key: "product", title: "商品", render: (row) => row.productName },
      { key: "amount", title: "金额", render: (row) => currency(row.settlement) },
      { key: "audit", title: "审核", render: (row) => <StatusBadge>{row.auditStatus}</StatusBadge> },
      { key: "pay", title: "付款", render: (row) => <StatusBadge>{row.payStatus}</StatusBadge> },
      { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => onAction(`已查看 ${row.id}`)}>查看</button><button className="ghost-btn" onClick={() => onAction(`${row.id} 已标记为待处理`) }>处理</button></div> },
    ]}
  />;
}

function PackageRows({ onAction }: { onAction: (message: string) => void }) {
  return <DataTable
    data={packages}
    columns={[
      { key: "id", title: "包裹编号", render: (row) => row.id },
      { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
      { key: "buyer", title: "买手", render: (row) => row.buyer },
      { key: "product", title: "商品", render: (row) => row.product },
      { key: "eta", title: "预计到达", render: (row) => dateText(row.expectedAt) },
      { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
      { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => onAction(`已查看包裹 ${row.id}`)}>查看</button><button className="ghost-btn" onClick={() => onAction(`${row.id} 已标记为待处理`) }>处理</button></div> },
    ]}
  />;
}
