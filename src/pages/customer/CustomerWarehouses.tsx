import { Plus } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { warehouseAddresses } from "../../data/mockData";
import { requireCurrentUser } from "../../utils/auth";
import { useApiList } from "../../utils/useApiList";

export function CustomerWarehouses() {
  const user = requireCurrentUser();
  const { data: addresses, loading, error } = useApiList(`/api/warehouses?owner=${encodeURIComponent(user.displayName)}`, warehouseAddresses.filter((item) => item.owner === user.displayName));

  return (
    <div>
      <PageHeader
        title="我的仓库地址"
        desc={error || (loading ? "正在从后端加载我的仓库地址..." : "客户提交自己的美国收货地址，管理员审核启用后买手才能在回填时选择。")}
        actions={<button className="primary-btn flex items-center gap-2"><Plus size={18} />提交地址</button>}
      />
      <FilterBar>
        <SelectFilter label="审核状态" options={["待审核", "启用", "停用"]} />
        <SelectFilter label="州/地区" options={["CA", "NY", "TX", "OR"]} />
      </FilterBar>
      <section className="panel mb-5 p-5">
        <h2 className="text-lg font-black text-ink">美国地址提交</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <Input label="仓库名称" placeholder="纽约中转仓" />
          <Input label="收货人" placeholder="Ben Miller" />
          <Input label="电话" placeholder="+1 718 555 0126" />
          <Input label="国家" value="US" readOnly />
          <Input label="Address Line 1" placeholder="41-20 39th St" />
          <Input label="Address Line 2" placeholder="Suite / Dock / Unit" />
          <Input label="City" placeholder="Long Island City" />
          <Input label="State" placeholder="NY" />
          <Input label="ZIP Code" placeholder="11104" />
          <button className="primary-btn self-end">提交审核</button>
        </div>
      </section>
      <DataTable
        data={addresses}
        columns={[
          { key: "name", title: "仓库名称", render: (row) => row.name },
          { key: "contact", title: "收货人", render: (row) => row.contactName },
          { key: "phone", title: "电话", render: (row) => row.phone },
          { key: "address", title: "美国地址", render: (row) => `${row.addressLine1}${row.addressLine2 ? `, ${row.addressLine2}` : ""}, ${row.city}, ${row.state} ${row.zipCode}` },
          { key: "status", title: "审核状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn">编辑</button><button className="ghost-btn" disabled={row.status === "启用"}>重新提交</button></div> },
        ]}
      />
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input {...inputProps} className="soft-input h-12 w-full px-4" /></label>;
}
