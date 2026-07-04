import { AlertTriangle, Banknote, Boxes, Camera, CheckCircle2, Clock, PackageOpen, WalletCards } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { fillRecords, packages, trendData } from "../data/mockData";
import { downloadReportCsv } from "../utils/api";
import { currency } from "../utils/format";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader
        title="首页总览"
        desc="采购、付款、物流、仓库、异常和成本的一屏总览。"
        actions={<><button className="ghost-btn" onClick={() => downloadReportCsv("monthly")}>导出本月报表</button><button className="primary-btn" onClick={() => navigate("/purchase/tasks/new")}>发布采购任务</button></>}
      />
      <div className="grid grid-cols-4 gap-5">
        <StatCard title="本月已付买手金额" value={currency(224800)} hint="较上月 +12.6%" icon={Banknote} tone="green" />
        <StatCard title="已付待确认金额" value={currency(84960)} hint="仓库未确认入库" icon={Clock} tone="violet" />
        <StatCard title="实际入库采购成本" value={currency(186420)} hint="已收货后转成本" icon={CheckCircle2} tone="sky" />
        <StatCard title="买手待抵扣金额" value={currency(11800)} hint="异常退款或下次抵扣" icon={WalletCards} tone="orange" />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-5">
        <StatCard title="在途包裹" value="38" hint="含 4 个今日预计到达" icon={Boxes} tone="sky" />
        <StatCard title="预计到达超时" value="7" hint="需要仓库核查" icon={AlertTriangle} tone="orange" />
        <StatCard title="仓库待确认" value="15" hint="扫描或输入运单号确认" icon={PackageOpen} tone="violet" />
        <StatCard title="异常包裹" value="3" hint="空包 / 少货 / 丢失" icon={Camera} tone="rose" />
      </div>

      <div className="mt-5 grid grid-cols-[1.45fr_0.85fr] gap-5">
        <section className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-ink">采购金额趋势</h2>
              <p className="text-sm font-semibold text-slate-500">已付款金额与实际入库成本对比</p>
            </div>
            <button className="ghost-btn">本年</button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="paid" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.32} /><stop offset="95%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient>
                  <linearGradient id="inbound" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.32} /><stop offset="95%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="paid" name="已付买手" stroke="#38bdf8" strokeWidth={3} fill="url(#paid)" />
                <Area type="monotone" dataKey="inbound" name="入库成本" stroke="#34d399" strokeWidth={3} fill="url(#inbound)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel p-6">
          <h2 className="text-xl font-black text-ink">待处理事项</h2>
          <div className="mt-4 space-y-3">
            {["UPS 1Z999 预计今日到达，请仓库确认", "买手 Alex 有 27,960 元待付款", "Prizm Mega 采购任务已超时 1 天", "Noah 的异常包裹待生成抵扣"].map((item, index) => (
              <div key={item} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-2xl bg-white text-sm font-black text-slate-700 shadow-sm">{index + 1}</span>
                  <p className="text-sm font-bold leading-6 text-slate-650">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-[1.35fr_0.95fr] gap-5">
        <section>
          <h2 className="mb-3 text-xl font-black text-ink">最近采购回填</h2>
          <DataTable
            data={fillRecords}
            columns={[
              { key: "id", title: "回填编号", render: (row) => row.id },
              { key: "buyer", title: "买手", render: (row) => row.buyer },
              { key: "product", title: "商品", render: (row) => row.productName },
              { key: "amount", title: "结算金额", render: (row) => currency(row.settlement) },
              { key: "status", title: "状态", render: (row) => <StatusBadge>{row.payStatus}</StatusBadge> },
            ]}
          />
        </section>
        <section>
          <h2 className="mb-3 text-xl font-black text-ink">买手余额排行</h2>
          <div className="panel p-5">
            {packages.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
                <div>
                  <p className="font-black text-ink">{item.buyer}</p>
                  <p className="text-xs font-semibold text-slate-400">{item.product}</p>
                </div>
                <p className="text-lg font-black text-ink">{currency(item.paidAmount - item.inboundCost)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
