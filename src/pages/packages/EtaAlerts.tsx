import { BellRing, ExternalLink } from "lucide-react";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { openTracking } from "../../data/carrierConfig";
import { packages } from "../../data/mockData";
import { currency, dateText } from "../../utils/format";

export function EtaAlerts() {
  const overdue = packages.filter((item) => item.overdue && item.status !== "已收货");
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
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn p-2" title="打开快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}><ExternalLink size={16} /></button><button className="ghost-btn flex gap-2"><BellRing size={16} />提醒仓库</button><button className="ghost-btn">标记未收到</button><button className="ghost-btn">继续等待</button></div> },
        ]}
      />
    </div>
  );
}
