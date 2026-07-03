import { Camera, ExternalLink } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { UploadBox } from "../../components/UploadBox";
import { packages, photos } from "../../data/mockData";
import { openTracking } from "../../data/carrierConfig";
import type { PackageItem } from "../../types";
import { currency, dateText } from "../../utils/format";

export function WarehouseReceived() {
  const [selected, setSelected] = useState<PackageItem | null>(null);
  const data = packages.filter((item) => item.status === "已收货");

  return (
    <div>
      <PageHeader title="已收货包裹" desc="仓库确认收到后的包裹记录，照片从对应运单号进入上传和查看。" />
      <DataTable
        data={data}
        columns={[
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "carrier", title: "快递公司", render: (row) => row.carrier },
          { key: "receivedAt", title: "收货时间", render: (row) => row.receivedAt ? dateText(row.receivedAt) : "-" },
          { key: "product", title: "商品摘要", render: (row) => row.product },
          { key: "qty", title: "实收数量", render: (row) => row.productQty },
          { key: "recipient", title: "收货人", render: (row) => row.recipient },
          { key: "cost", title: "实际入库成本", render: (row) => currency(row.inboundCost) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="primary-btn py-2" onClick={() => setSelected(row)}>上传照片</button><button className="ghost-btn p-2" title="打开快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}><ExternalLink size={16} /></button></div> },
        ]}
      />
      <Modal open={!!selected} title="包裹照片" onClose={() => setSelected(null)}>
        {selected && <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-400">对应运单号</p>
            <p className="mt-2 font-black text-ink">{selected.trackingNo}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <UploadBox label="外箱照片" />
            <UploadBox label="商品照片" />
            <UploadBox label="异常补充照片" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {photos.filter((photo) => photo.trackingNo === selected.trackingNo).map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-3xl bg-slate-50">
                <img src={photo.url} alt={photo.type} className="h-36 w-full object-cover" />
                <div className="p-3 text-sm font-bold text-slate-600">
                  <p className="text-ink">{photo.type}</p>
                  <p>{photo.uploader} · {photo.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="primary-btn w-full" onClick={() => setSelected(null)}><Camera className="inline" size={18} /> 保存照片</button>
        </div>}
      </Modal>
    </div>
  );
}
