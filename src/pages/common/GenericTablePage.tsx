import { BarChart3, Boxes, ClipboardList } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { fillRecords, packages, tasks } from "../../data/mockData";
import type { BuyerFillRecord, PackageItem, PurchaseTask } from "../../types";
import { currency, dateText, paymentStatusText } from "../../utils/format";
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
  const [selectedTask, setSelectedTask] = useState<PurchaseTask | null>(null);
  const [editingTask, setEditingTask] = useState<PurchaseTask | null>(null);
  const [editedStatus, setEditedStatus] = useState<Record<string, string>>({});

  const saveEdit = (row: PurchaseTask, status: string) => {
    setEditedStatus((current) => ({ ...current, [row.id]: status }));
    onAction(`${row.id} 已更新为 ${status}`);
  };

  return (
    <>
      <DataTable
        data={tasks}
        columns={[
          { key: "id", title: "编号", render: (row) => row.id },
          { key: "product", title: "商品", render: (row) => row.productName },
          { key: "target", title: "目标单价", render: (row) => currency(row.targetPrice) },
          { key: "qty", title: "数量", render: (row) => row.quantity },
          { key: "deadline", title: "截止时间", render: (row) => dateText(row.deadline) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{editedStatus[row.id] ?? row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => setSelectedTask(row)}>查看</button><button className="ghost-btn" onClick={() => setEditingTask(row)}>编辑</button></div> },
        ]}
      />
      <Modal open={!!selectedTask} title={selectedTask ? `${selectedTask.id} 任务详情` : "任务详情"} onClose={() => setSelectedTask(null)}>
        {selectedTask && <TaskDetail task={selectedTask} status={editedStatus[selectedTask.id]} />}
      </Modal>
      <Modal open={!!editingTask} title={editingTask ? `${editingTask.id} 编辑状态` : "编辑状态"} onClose={() => setEditingTask(null)}>
        {editingTask && (
          <div className="space-y-5">
            <TaskDetail task={editingTask} status={editedStatus[editingTask.id]} compact />
            <div className="grid grid-cols-3 gap-3">
              {["接单中", "已完成", "暂停"].map((status) => (
                <button key={status} className={status === "已完成" ? "primary-btn" : "ghost-btn"} onClick={() => saveEdit(editingTask, status)}>{status}</button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function BuyerRows({ onAction }: { onAction: (message: string) => void }) {
  const [selectedRecord, setSelectedRecord] = useState<BuyerFillRecord | null>(null);
  const [processingRecord, setProcessingRecord] = useState<BuyerFillRecord | null>(null);
  const [handled, setHandled] = useState<Record<string, string>>({});

  const handleRecord = (row: BuyerFillRecord, action: string) => {
    const message = `${row.id} ${action}`;
    setHandled((current) => ({ ...current, [row.id]: message }));
    onAction(message);
  };

  return (
    <>
      <DataTable
        data={fillRecords}
        columns={[
          { key: "id", title: "编号", render: (row) => row.id },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "product", title: "商品", render: (row) => row.productName },
          { key: "amount", title: "金额", render: (row) => currency(row.settlement) },
          { key: "audit", title: "审核", render: (row) => <StatusBadge>{row.auditStatus}</StatusBadge> },
          { key: "pay", title: "付款", render: (row) => <StatusBadge>{row.payStatus}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => setSelectedRecord(row)}>查看</button><button className="ghost-btn" onClick={() => setProcessingRecord(row)}>处理</button></div> },
        ]}
      />
      <Modal open={!!selectedRecord} title={selectedRecord ? `${selectedRecord.id} 回填详情` : "回填详情"} onClose={() => setSelectedRecord(null)}>
        {selectedRecord && <BuyerRecordDetail record={selectedRecord} handlingNote={handled[selectedRecord.id]} />}
      </Modal>
      <Modal open={!!processingRecord} title={processingRecord ? `${processingRecord.id} 处理` : "回填处理"} onClose={() => setProcessingRecord(null)}>
        {processingRecord && (
          <div className="space-y-5">
            <BuyerRecordDetail record={processingRecord} handlingNote={handled[processingRecord.id]} compact />
            <div className="grid grid-cols-3 gap-3">
              <button className="primary-btn" onClick={() => handleRecord(processingRecord, "已通过审核，进入付款队列")}>通过审核</button>
              <button className="ghost-btn" onClick={() => handleRecord(processingRecord, "已登记下次抵扣")}>登记抵扣</button>
              <button className="ghost-btn" onClick={() => handleRecord(processingRecord, "已驳回并要求买手补充资料")}>驳回补充</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function PackageRows({ onAction }: { onAction: (message: string) => void }) {
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [processingPackage, setProcessingPackage] = useState<PackageItem | null>(null);
  const [handlingNotes, setHandlingNotes] = useState<Record<string, string>>({});

  const setHandling = (row: PackageItem, action: string) => {
    const message = `${row.id} ${action}`;
    setHandlingNotes((current) => ({ ...current, [row.id]: message }));
    onAction(message);
  };

  return (
    <>
      <DataTable
        data={packages}
        columns={[
          { key: "id", title: "包裹编号", render: (row) => row.id },
          { key: "tracking", title: "运单号", render: (row) => <button className="font-black text-sky-700" onClick={() => openTracking(row.carrier, row.trackingNo)}>{row.trackingNo}</button> },
          { key: "buyer", title: "买手", render: (row) => row.buyer },
          { key: "product", title: "商品", render: (row) => row.product },
          { key: "eta", title: "预计到达", render: (row) => dateText(row.expectedAt) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          {
            key: "actions",
            title: "操作",
            render: (row) => (
              <div className="flex gap-2">
                <button className="ghost-btn" onClick={() => setSelectedPackage(row)}>查看</button>
                <button className="ghost-btn" onClick={() => setProcessingPackage(row)}>处理</button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={Boolean(selectedPackage)} title={selectedPackage ? `${selectedPackage.id} 包裹详情` : "包裹详情"} onClose={() => setSelectedPackage(null)}>
        {selectedPackage ? <PackageDetail packageItem={selectedPackage} handlingNote={handlingNotes[selectedPackage.id]} /> : null}
      </Modal>

      <Modal open={Boolean(processingPackage)} title={processingPackage ? `${processingPackage.id} 处理` : "包裹处理"} onClose={() => setProcessingPackage(null)}>
        {processingPackage ? (
          <div className="space-y-5">
            <PackageDetail packageItem={processingPackage} handlingNote={handlingNotes[processingPackage.id]} compact />
            <div className="grid grid-cols-3 gap-3">
              <button className="primary-btn" onClick={() => setHandling(processingPackage, "已确认仓库收到，等待成本复核")}>确认收货</button>
              <button className="ghost-btn" onClick={() => setHandling(processingPackage, "已登记物流异常，异常金额不计入入库成本")}>登记异常</button>
              <button className="ghost-btn" onClick={() => setHandling(processingPackage, "已联系买手补充凭证")}>联系买手</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function TaskDetail({ task, status, compact = false }: { task: PurchaseTask; status?: string; compact?: boolean }) {
  const details = [
    ["商品名称", task.productName],
    ["发布来源", task.source],
    ["发布人", task.requester],
    ["目标单价", currency(task.targetPrice)],
    ["采购数量", `${task.quantity} 件`],
    ["已接数量", `${task.accepted} 件`],
    ["已采购", `${task.purchased} 件`],
    ["已到仓", `${task.arrived} 件`],
    ["当前买手", task.buyer],
    ["收货仓库", task.warehouse],
    ["收货人", task.recipient],
    ["截止时间", dateText(task.deadline)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="text-sm font-black text-slate-400">{task.id}</div>
          <div className="mt-1 text-lg font-black text-ink">{task.productName}</div>
        </div>
        <StatusBadge>{status ?? task.status}</StatusBadge>
      </div>
      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-3`}>
        <AmountTile label="目标单价" value={currency(task.targetPrice)} tone="violet" />
        <AmountTile label="剩余数量" value={`${Math.max(task.quantity - task.accepted, 0)} 件`} tone="sky" />
        <AmountTile label="到仓进度" value={`${task.arrived}/${task.quantity}`} tone="emerald" />
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
        {details.map(([label, value]) => <DetailCell key={label} label={label} value={value} />)}
      </div>
      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">{task.requirement}</div>
    </div>
  );
}

function BuyerRecordDetail({ record, handlingNote, compact = false }: { record: BuyerFillRecord; handlingNote?: string; compact?: boolean }) {
  const details = [
    ["接单编号", record.orderId],
    ["买手", record.buyer],
    ["商品名称", record.productName],
    ["采购数量", `${record.quantity} 件`],
    ["采购单价", currency(record.unitPrice)],
    ["结算金额", currency(record.settlement)],
    ["是否超价", record.overPrice ? "是" : "否"],
    ["运单号", record.trackingNo],
    ["收货仓库", record.warehouse],
    ["收货人", record.recipient],
    ["预计到达", record.warehouseEta ? dateText(record.warehouseEta) : "待维护"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="text-sm font-black text-slate-400">{record.id}</div>
          <div className="mt-1 text-lg font-black text-ink">{record.productName}</div>
        </div>
        <StatusBadge>{record.payStatus}</StatusBadge>
      </div>
      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-3`}>
        <AmountTile label="结算金额" value={currency(record.settlement)} tone="violet" />
        <AmountTile label="采购数量" value={`${record.quantity} 件`} tone="sky" />
        <AmountTile label="审核状态" value={record.auditStatus} tone={record.auditStatus === "待审核" ? "rose" : "emerald"} />
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
        {details.map(([label, value]) => <DetailCell key={label} label={label} value={value} />)}
      </div>
      {handlingNote ? <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{handlingNote}</div> : null}
    </div>
  );
}

function PackageDetail({ packageItem, handlingNote, compact = false }: { packageItem: PackageItem; handlingNote?: string; compact?: boolean }) {
  const details = [
    ["承运商", packageItem.carrier],
    ["运单号", packageItem.trackingNo],
    ["买手", packageItem.buyer],
    ["商品", packageItem.product],
    ["仓库", packageItem.warehouse],
    ["收件人", packageItem.recipient],
    ["预计到达", dateText(packageItem.expectedAt)],
    ["实际收货", packageItem.receivedAt ? dateText(packageItem.receivedAt) : "未确认收货"],
    ["关联采购", `${packageItem.linkedPurchases} 条`],
    ["商品数量", `${packageItem.productQty} 件`],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="text-sm font-black text-slate-400">{packageItem.product}</div>
          <button className="mt-1 text-left text-lg font-black text-sky-700" onClick={() => openTracking(packageItem.carrier, packageItem.trackingNo)}>
            {packageItem.trackingNo}
          </button>
        </div>
        <StatusBadge>{packageItem.status}</StatusBadge>
      </div>

      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-3`}>
        <AmountTile label="已付待确认" value={currency(packageItem.paidPendingConfirmAmount)} tone="violet" />
        <AmountTile label="实际入库成本" value={currency(packageItem.inboundCost)} tone="emerald" />
        <AmountTile label="异常金额" value={currency(packageItem.exceptionAmount)} tone="rose" />
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="border-b border-slate-100 pb-2">
            <div className="text-xs font-black text-slate-400">{label}</div>
            <div className="mt-1 font-bold text-slate-700">{value}</div>
          </div>
        ))}
        <div className="border-b border-slate-100 pb-2">
          <div className="text-xs font-black text-slate-400">付款状态</div>
          <div className="mt-1"><StatusBadge>{paymentStatusText[packageItem.paymentStatus]}</StatusBadge></div>
        </div>
        <div className="border-b border-slate-100 pb-2">
          <div className="text-xs font-black text-slate-400">超时标记</div>
          <div className="mt-1 font-bold text-slate-700">{packageItem.overdue ? "已超时，需要跟进" : "未超时"}</div>
        </div>
      </div>

      {handlingNote ? <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{handlingNote}</div> : null}
    </div>
  );
}

function AmountTile({ label, value, tone }: { label: string; value: string; tone: "violet" | "emerald" | "rose" | "sky" }) {
  const color = {
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
  }[tone];

  return (
    <div className={`rounded-2xl px-4 py-3 ${color}`}>
      <div className="text-xs font-black opacity-70">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 pb-2">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-1 font-bold text-slate-700">{value}</div>
    </div>
  );
}
