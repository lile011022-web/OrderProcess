import { ExternalLink, Eye } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Drawer } from "../../components/Drawer";
import { PackagePhotoGrid } from "../../components/PackagePhotoGrid";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { openTracking } from "../../data/carrierConfig";
import { packages } from "../../data/mockData";
import type { PackageItem } from "../../types";
import { requireCurrentUser } from "../../utils/auth";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function CustomerPackages() {
  const user = requireCurrentUser();
  const [selected, setSelected] = useState<PackageItem | null>(null);
  const { data, loading, error } = useApiList<PackageItem>(
    `/api/packages?owner=${encodeURIComponent(user.displayName)}`,
    packages.filter((item) => item.owner === user.displayName),
  );

  return (
    <div>
      <PageHeader title="我的包裹" desc={error || (loading ? "正在从后端加载我的包裹..." : "查看仓库已导入并分配给我的货物、运单和照片。")} />
      <DataTable
        data={data}
        columns={[
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "carrier", title: "快递", render: (row) => row.carrier },
          { key: "product", title: "商品摘要", render: (row) => row.product },
          { key: "qty", title: "数量", render: (row) => row.productQty },
          { key: "warehouse", title: "仓库", render: (row) => row.warehouse || "-" },
          { key: "receivedAt", title: "收货时间", render: (row) => row.receivedAt ? dateText(row.receivedAt) : "-" },
          { key: "cost", title: "入库成本", render: (row) => currency(row.inboundCost) },
          { key: "photos", title: "照片", render: (row) => `${row.photoCount || 0} 张` },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn p-2" title="查看详情" onClick={() => setSelected(row)}><Eye size={16} /></button><button className="ghost-btn p-2" title="官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}><ExternalLink size={16} /></button></div> },
        ]}
      />
      <Drawer open={!!selected} title="包裹详情" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-5">
          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-ink">{selected.carrier} {selected.trackingNo}</p>
              <button className="ghost-btn" onClick={() => openTracking(selected.carrier, selected.trackingNo)}>官网查询</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="商品摘要" value={selected.product} />
              <Info label="实收数量" value={String(selected.productQty)} />
              <Info label="仓库" value={selected.warehouse || "-"} />
              <Info label="收货人" value={selected.recipient || "-"} />
              <Info label="收货时间" value={selected.receivedAt ? dateText(selected.receivedAt) : "-"} />
              <Info label="导入批次" value={selected.importBatchNo || "-"} />
              <Info label="实际入库成本" value={currency(selected.inboundCost)} />
              <Info label="备注" value={selected.note || "-"} />
            </div>
          </div>
          <section className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
            <h3 className="mb-3 font-black text-ink">仓库照片</h3>
            <PackagePhotoGrid packageId={selected.id} />
          </section>
        </div>}
      </Drawer>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-1 font-black text-ink">{value}</p></div>;
}
