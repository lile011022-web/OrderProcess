import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { UploadBox } from "../../components/UploadBox";
import { openTracking } from "../../data/carrierConfig";
import { packages } from "../../data/mockData";
import type { PackageItem } from "../../types";
import { getCurrentUser } from "../../utils/auth";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function WarehouseOverdue() {
  const [selected, setSelected] = useState<PackageItem | null>(null);
  const { data: packageRows, loading, error } = useApiList<PackageItem>("/api/packages?overdue=true", packages.filter((item) => item.overdue));
  const data = packageRows.filter((item) => item.overdue);
  const user = getCurrentUser();
  return (
    <div>
      <PageHeader title="超时待核查" desc={error || (loading ? "正在从后端加载超时包裹..." : "预计到达超时只提醒仓库核查，不直接生成异常金额。")} />
      <DataTable
        data={data}
        columns={[
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "carrier", title: "快递公司", render: (row) => row.carrier },
          { key: "eta", title: "预计到达", render: (row) => dateText(row.expectedAt) },
          { key: "days", title: "超时天数", render: () => "2 天" },
          { key: "product", title: "商品摘要", render: (row) => row.product },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "paid", title: "已付金额", render: (row) => user?.role === "warehouse" ? "权限隐藏" : currency(row.paidAmount) },
          { key: "status", title: "处理状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" title="打开快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>官网查询</button><button className="primary-btn py-2" onClick={() => setSelected(row)}>核查</button><button className="ghost-btn">继续等待</button></div> },
        ]}
      />
      <Modal open={!!selected} title="超时核查" onClose={() => setSelected(null)}>
        <div className="space-y-4">
          <select className="soft-input h-12 w-full px-4"><option>继续等待</option><option>已收到</option><option>未收到</option><option>物流异常</option></select>
          <textarea className="soft-input min-h-28 w-full p-4" placeholder="官网查询结果备注" />
          <div className="grid grid-cols-2 gap-4">
            <UploadBox label="官网截图" />
            <UploadBox label="包裹/异常照片" />
          </div>
          <label className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4 font-bold"><input type="checkbox" defaultChecked className="h-5 w-5 accent-slate-900" />提醒管理员</label>
          <textarea className="soft-input min-h-24 w-full p-4" placeholder="备注" />
          <button className="primary-btn w-full" onClick={() => setSelected(null)}>提交</button>
        </div>
      </Modal>
    </div>
  );
}
