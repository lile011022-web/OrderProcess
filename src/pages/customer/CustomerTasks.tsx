import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { tasks } from "../../data/mockData";
import { requireCurrentUser } from "../../utils/auth";
import { currency, dateText } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function CustomerTasks() {
  const user = requireCurrentUser();
  const { data, loading, error } = useApiList(`/api/tasks?role=customer&owner=${encodeURIComponent(user.displayName)}`, tasks.filter((task) => task.requester === user.displayName));
  const published = data.filter((task) => task.status === "已发布").length;
  const accepting = data.filter((task) => task.status === "接单中").length;
  const totalBudget = data.reduce((sum, task) => sum + task.targetPrice * task.quantity, 0);

  return (
    <div>
      <PageHeader
        title="我的采购任务"
        desc={error || (loading ? "正在从后端加载我的采购任务..." : "客户发布采购需求后，买手在任务大厅接单；客户可追踪接单、采购和到仓进度。")}
        actions={<Link to="/customer/tasks/new" className="primary-btn flex items-center gap-2"><Plus size={18} />发布采购任务</Link>}
      />
      <div className="mb-5 grid grid-cols-4 gap-5">
        <StatCard title="我的任务数" value={String(data.length)} />
        <StatCard title="已发布任务" value={String(published)} tone="sky" />
        <StatCard title="接单中任务" value={String(accepting)} tone="violet" />
        <StatCard title="预计采购预算" value={currency(totalBudget)} tone="green" />
      </div>
      <FilterBar placeholder="搜索我的任务、商品名称">
        <SelectFilter label="任务状态" options={["已发布", "接单中", "已完成", "超时"]} />
        <SelectFilter label="截止时间" options={["今天", "本周", "本月"]} />
      </FilterBar>
      <DataTable
        data={data}
        columns={[
          { key: "id", title: "任务编号", render: (row) => row.id },
          { key: "product", title: "商品名称", render: (row) => row.productName },
          { key: "price", title: "目标单价", render: (row) => currency(row.targetPrice) },
          { key: "qty", title: "需求数量", render: (row) => row.quantity },
          { key: "accepted", title: "已接数量", render: (row) => row.accepted },
          { key: "purchased", title: "已采购", render: (row) => row.purchased },
          { key: "arrived", title: "已到仓", render: (row) => row.arrived },
          { key: "buyer", title: "当前买手", render: (row) => row.buyer },
          { key: "warehouse", title: "收货仓库", render: (row) => row.warehouse },
          { key: "deadline", title: "截止时间", render: (row) => dateText(row.deadline) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: () => <div className="flex gap-2"><button className="ghost-btn">查看进度</button><button className="ghost-btn">复制再发</button></div> },
        ]}
      />
    </div>
  );
}
