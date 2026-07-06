import { Plus } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { warehouseAddresses } from "../../data/mockData";
import type { WarehouseAddress } from "../../types";
import { createRecordApi, updateRecordApi } from "../../utils/api";
import { requireCurrentUser } from "../../utils/auth";
import { useApiList } from "../../utils/useApiList";

export function CustomerWarehouses() {
  const user = requireCurrentUser();
  const { data: addresses, loading, error, setData } = useApiList<WarehouseAddress>(`/api/warehouses?owner=${encodeURIComponent(user.displayName)}`, warehouseAddresses.filter((item) => item.owner === user.displayName));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createRecordApi<WarehouseAddress>("warehouse", {
      name: String(form.get("name") || ""),
      contactName: String(form.get("contactName") || ""),
      phone: String(form.get("phone") || ""),
      addressLine1: String(form.get("addressLine1") || ""),
      addressLine2: String(form.get("addressLine2") || ""),
      city: String(form.get("city") || ""),
      state: String(form.get("state") || ""),
      zipCode: String(form.get("zipCode") || ""),
      country: "US",
      status: "待审核",
    });
    setData((rows) => [result.data, ...rows]);
    event.currentTarget.reset();
  }

  async function resubmit(row: WarehouseAddress) {
    const result = await updateRecordApi<WarehouseAddress>("warehouse", row.id, { status: "待审核" });
    setData((rows) => rows.map((item) => item.id === row.id ? result.data : item));
  }

  return (
    <div>
      <PageHeader
        title="我的仓库地址"
        desc={error || (loading ? "正在从后端加载我的仓库地址..." : "客户提交自己的美国收货地址，管理员审核启用后买手才能在回填时选择。")}
        actions={<button className="primary-btn flex items-center gap-2" onClick={() => document.getElementById("customer-warehouse-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}><Plus size={18} />提交地址</button>}
      />
      <FilterBar>
        <SelectFilter label="审核状态" options={["待审核", "启用", "停用"]} />
        <SelectFilter label="州/地区" options={["CA", "NY", "TX", "OR"]} />
      </FilterBar>
      <form id="customer-warehouse-form" className="panel mb-5 p-5" onSubmit={submit}>
        <h2 className="text-lg font-black text-ink">美国地址提交</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <Input name="name" label="仓库名称" placeholder="纽约中转仓" required />
          <Input name="contactName" label="收货人" placeholder="Ben Miller" required />
          <Input name="phone" label="电话" placeholder="+1 718 555 0126" />
          <Input label="国家" value="US" readOnly />
          <Input name="addressLine1" label="Address Line 1" placeholder="41-20 39th St" required />
          <Input name="addressLine2" label="Address Line 2" placeholder="Suite / Dock / Unit" />
          <Input name="city" label="City" placeholder="Long Island City" />
          <Input name="state" label="State" placeholder="NY" />
          <Input name="zipCode" label="ZIP Code" placeholder="11104" />
          <button className="primary-btn self-end">提交审核</button>
        </div>
      </form>
      <DataTable
        data={addresses}
        columns={[
          { key: "name", title: "仓库名称", render: (row) => row.name },
          { key: "contact", title: "收货人", render: (row) => row.contactName },
          { key: "phone", title: "电话", render: (row) => row.phone },
          { key: "address", title: "美国地址", render: (row) => `${row.addressLine1}${row.addressLine2 ? `, ${row.addressLine2}` : ""}, ${row.city}, ${row.state} ${row.zipCode}` },
          { key: "status", title: "审核状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => resubmit(row)}>编辑</button><button className="ghost-btn" disabled={row.status === "启用"} onClick={() => resubmit(row)}>重新提交</button></div> },
        ]}
      />
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input {...inputProps} className="soft-input h-12 w-full px-4" /></label>;
}
