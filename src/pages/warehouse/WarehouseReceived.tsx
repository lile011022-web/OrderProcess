import { Camera, Download, ExternalLink, Upload } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { PackagePhotoGrid } from "../../components/PackagePhotoGrid";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { UploadBox } from "../../components/UploadBox";
import { Toast } from "../../components/Toast";
import { packages } from "../../data/mockData";
import { inferCarrier, openTracking } from "../../data/carrierConfig";
import type { PackageItem } from "../../types";
import { createRecordApi, downloadWarehouseInventoryTemplate, uploadFileApi } from "../../utils/api";
import { currency, dateText } from "../../utils/format";
import { authUsers } from "../../utils/permissions";
import { useApiList } from "../../utils/useApiList";

type ImportRow = {
  trackingNo: string;
  carrier: PackageItem["carrier"];
  product: string;
  productQty: number;
  warehouse: string;
  recipient: string;
  inboundCost: number;
  note: string;
};

export function WarehouseReceived() {
  const [selected, setSelected] = useState<PackageItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [customerName, setCustomerName] = useState(authUsers.customer.displayName);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState("");
  const { data: packageRows, loading, error, setData } = useApiList<PackageItem>(`/api/packages?status=${encodeURIComponent("已收货")}`, packages.filter((item) => item.status === "已收货"));
  const data = packageRows.filter((item) => item.status === "已收货");
  const customers = Object.values(authUsers).filter((user) => user.role === "customer");

  async function parseImportFile(file: File) {
    const text = await file.text();
    const rows = parseDelimitedRows(text);
    const parsed = rows.slice(1)
      .map((row) => normalizeImportRow(row))
      .filter((row): row is ImportRow => Boolean(row));
    setImportRows(parsed);
    setImportFileName(file.name);
    setToast(parsed.length ? `已读取 ${parsed.length} 条待导入货物` : "没有读取到有效货物，请检查模板列");
    setTimeout(() => setToast(""), 2200);
  }

  async function submitImport() {
    if (!importRows.length) {
      setToast("请先选择并读取导入文件");
      setTimeout(() => setToast(""), 2200);
      return;
    }
    setImporting(true);
    try {
      const batchNo = `WH-${Date.now().toString().slice(-8)}`;
      const created: PackageItem[] = [];
      for (const row of importRows) {
        const result = await createRecordApi<PackageItem>("package", {
          ...row,
          owner: customerName,
          importBatchNo: batchNo,
          buyer: "仓库导入",
          expectedAt: new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          status: "已收货",
          linkedPurchases: 1,
          paidAmount: row.inboundCost,
          paidPendingConfirmAmount: 0,
          exceptionAmount: 0,
          photoCount: photoFiles.length,
          paymentStatus: "confirmed_received",
          overdue: false,
        });
        for (const file of photoFiles) await uploadFileApi("package", result.data.id, file);
        created.push(result.data);
      }
      setData((rows) => [...created, ...rows]);
      setImportOpen(false);
      setImportRows([]);
      setImportFileName("");
      setPhotoFiles([]);
      setToast(`已导入 ${created.length} 条已收货货物，客户 ${customerName} 可在“我的包裹”查看`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "导入失败");
    } finally {
      setImporting(false);
      setTimeout(() => setToast(""), 2600);
    }
  }

  return (
    <div>
      <PageHeader
        title="已收货包裹"
        desc={error || (loading ? "正在从后端加载已收货包裹..." : "仓库确认收到后的包裹记录，支持从 Excel 模板批量导入现有货物并分配给客户。")}
        actions={<>
          <button className="ghost-btn flex items-center gap-2" onClick={downloadWarehouseInventoryTemplate}><Download size={18} />下载模板</button>
          <button className="primary-btn flex items-center gap-2" onClick={() => setImportOpen(true)}><Upload size={18} />导入已有货物</button>
        </>}
      />
      <DataTable
        data={data}
        columns={[
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" title="打开对应快递官网查询" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "carrier", title: "快递公司", render: (row) => row.carrier },
          { key: "owner", title: "客户", render: (row) => row.owner || "未指定" },
          { key: "receivedAt", title: "收货时间", render: (row) => row.receivedAt ? dateText(row.receivedAt) : "-" },
          { key: "product", title: "商品摘要", render: (row) => row.product },
          { key: "qty", title: "实收数量", render: (row) => row.productQty },
          { key: "recipient", title: "收货人", render: (row) => row.recipient },
          { key: "cost", title: "实际入库成本", render: (row) => currency(row.inboundCost) },
          { key: "photos", title: "照片", render: (row) => `${row.photoCount || 0} 张` },
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
          <PackagePhotoGrid packageId={selected.id} />
          <button className="primary-btn w-full" onClick={() => { setSelected(null); setToast("照片记录已保存到当前包裹"); setTimeout(() => setToast(""), 2200); }}><Camera className="inline" size={18} /> 保存照片</button>
        </div>}
      </Modal>
      <Modal open={importOpen} title="导入仓库已有货物" onClose={() => setImportOpen(false)}>
        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">选择客户</span>
            <select value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="soft-input h-12 w-full px-4 font-bold">
              {customers.map((customer) => <option key={customer.username} value={customer.displayName}>{customer.displayName}</option>)}
            </select>
          </label>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-black text-ink">导入文件</p>
            <p className="mt-1 text-xs font-bold text-slate-500">使用下载模板填写，Excel 可直接打开 CSV。必填列：运单号、商品摘要、数量。</p>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              className="mt-4 block w-full text-sm font-bold text-slate-600"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void parseImportFile(file);
              }}
            />
            {importFileName && <p className="mt-2 text-xs font-bold text-slate-500">已选择：{importFileName}</p>}
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-black text-ink">附带照片</p>
            <p className="mt-1 text-xs font-bold text-slate-500">可选择多张照片，导入后会附加到本批次每个包裹，客户详情中可查看。</p>
            <input type="file" accept="image/*" multiple className="mt-4 block w-full text-sm font-bold text-slate-600" onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))} />
            {!!photoFiles.length && <p className="mt-2 text-xs font-bold text-slate-500">已选择 {photoFiles.length} 张照片</p>}
          </div>
          <DataTable
            data={importRows}
            columns={[
              { key: "tracking", title: "运单号", render: (row) => row.trackingNo },
              { key: "carrier", title: "快递", render: (row) => row.carrier },
              { key: "product", title: "商品", render: (row) => row.product },
              { key: "qty", title: "数量", render: (row) => row.productQty },
              { key: "warehouse", title: "仓库", render: (row) => row.warehouse || "-" },
            ]}
          />
          <button disabled={importing || !importRows.length} className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60" onClick={submitImport}>
            {importing ? "正在导入..." : "确认导入并分配给客户"}
          </button>
        </div>
      </Modal>
      <Toast message={toast} />
    </div>
  );
}

function parseDelimitedRows(text: string) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map((line) => parseDelimitedLine(line, delimiter));
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeImportRow(row: string[]): ImportRow | null {
  const trackingNo = row[0]?.trim();
  const product = row[2]?.trim();
  if (!trackingNo || !product) return null;
  const carrier = (row[1]?.trim() as PackageItem["carrier"]) || inferCarrier(trackingNo) || "UPS";
  return {
    trackingNo,
    carrier: ["UPS", "FedEx", "USPS"].includes(carrier) ? carrier : inferCarrier(trackingNo) || "UPS",
    product,
    productQty: Math.max(1, Number(row[3]) || 1),
    warehouse: row[4]?.trim() || "仓库导入",
    recipient: row[5]?.trim() || "",
    inboundCost: Math.max(0, Number(row[6]) || 0),
    note: row[7]?.trim() || "",
  };
}
