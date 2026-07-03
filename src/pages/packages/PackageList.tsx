import { ExternalLink, Eye } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Drawer } from "../../components/Drawer";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { openTracking } from "../../data/carrierConfig";
import { packages, photos } from "../../data/mockData";
import type { PackageItem } from "../../types";
import { currency, dateText, paymentStatusText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function PackageList() {
  const [selected, setSelected] = useState<PackageItem | null>(null);
  const { data, loading, error } = useApiList<PackageItem>("/api/packages", packages);
  return (
    <div>
      <PageHeader title="包裹列表" desc={error || (loading ? "正在从后端加载包裹数据..." : "集中管理买手采购回填后的运单、预计到达、收货与异常。")} />
      <FilterBar placeholder="搜索快递公司、运单号、买手">
        <SelectFilter label="快递公司" options={["UPS", "FedEx", "USPS"]} />
        <SelectFilter label="包裹状态" options={["在途", "已收货", "预计到达超时", "物流异常"]} />
        <SelectFilter label="预计到达时间" options={["今天", "本周", "本月"]} />
        <SelectFilter label="仓库" options={["洛杉矶一号仓", "纽约中转仓", "俄勒冈免税仓"]} />
      </FilterBar>
      <DataTable
        data={data}
        columns={[
          { key: "id", title: "包裹编号", render: (row) => row.id },
          { key: "carrier", title: "快递公司", render: (row) => row.carrier },
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "linked", title: "关联采购数", render: (row) => row.linkedPurchases },
          { key: "qty", title: "商品数量", render: (row) => row.productQty },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "eta", title: "预计到达", render: (row) => dateText(row.expectedAt) },
          { key: "received", title: "实际收到", render: (row) => row.receivedAt ? dateText(row.receivedAt) : "-" },
          { key: "overdue", title: "是否超时", render: (row) => <StatusBadge>{row.overdue ? "超时" : "正常"}</StatusBadge> },
          { key: "status", title: "包裹状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "warehouse", title: "仓库", render: (row) => row.warehouse },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn p-2" title="查看包裹详情" onClick={() => setSelected(row)}><Eye size={16} /></button><button className="ghost-btn">编辑</button><button className="ghost-btn">标记异常</button><button className="ghost-btn p-2" title="打开快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}><ExternalLink size={16} /></button></div> },
        ]}
      />
      <Drawer open={!!selected} title="包裹详情" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-5">
          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between"><p className="font-black text-ink">{selected.carrier} {selected.trackingNo}</p><button className="ghost-btn" onClick={() => openTracking(selected.carrier, selected.trackingNo)}>官网查询</button></div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="预计到达" value={dateText(selected.expectedAt)} />
              <Info label="实际到达" value={selected.receivedAt ? dateText(selected.receivedAt) : "未收到"} />
              <Info label="状态" value={selected.status} />
              <Info label="收货仓库" value={selected.warehouse} />
              <Info label="是否超时" value={selected.overdue ? "是" : "否"} />
            </div>
          </div>
          <Section title="关联采购明细">
            <DataTable data={[selected]} columns={[
              { key: "id", title: "采购回填编号", render: () => "BF-240701-018" },
              { key: "buyer", title: "买手", render: (row) => row.buyer },
              { key: "product", title: "商品", render: (row) => row.product },
              { key: "need", title: "应收数量", render: (row) => row.productQty },
              { key: "real", title: "实收数量", render: (row) => row.status === "已收货" ? row.productQty : 0 },
              { key: "paid", title: "已付待确认金额", render: (row) => currency(row.paidPendingConfirmAmount) },
              { key: "cost", title: "实际入库成本", render: (row) => currency(row.inboundCost) },
              { key: "ex", title: "异常金额", render: (row) => currency(row.exceptionAmount) },
              { key: "st", title: "付款/入库状态", render: (row) => <StatusBadge>{paymentStatusText[row.paymentStatus]}</StatusBadge> },
            ]} />
          </Section>
          <Section title="仓库收货信息"><p className="text-sm font-semibold text-slate-600">仓库扫描确认后记录实际收到时间、实收数量与收货备注。</p></Section>
          <Section title="包裹照片"><div className="grid grid-cols-3 gap-3">{photos.slice(0, 3).map((photo) => <img key={photo.id} src={photo.url} className="h-24 rounded-2xl object-cover" alt={photo.type} />)}</div></Section>
          <Section title="费用与异常信息"><p className="text-sm font-semibold text-slate-600">已付待确认 {currency(selected.paidPendingConfirmAmount)}，实际入库成本 {currency(selected.inboundCost)}，异常金额 {currency(selected.exceptionAmount)}。付款后需仓库确认收到才转入实际入库成本。</p></Section>
        </div>}
      </Drawer>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-1 font-black text-ink">{value}</p></div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl bg-white p-4 ring-1 ring-slate-100"><h3 className="mb-3 font-black text-ink">{title}</h3>{children}</section>;
}
