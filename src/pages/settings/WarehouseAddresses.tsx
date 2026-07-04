import { Plus } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { warehouseAddresses } from "../../data/mockData";
import type { WarehouseAddress } from "../../types";
import { createRecordApi, updateRecordApi } from "../../utils/api";
import { useApiList } from "../../utils/useApiList";

export function WarehouseAddresses() {
  const { data, loading, error, setData } = useApiList<WarehouseAddress>("/api/warehouses", warehouseAddresses);

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
      status: "启用",
    });
    setData((rows) => [result.data, ...rows]);
    event.currentTarget.reset();
  }

  async function setStatus(row: WarehouseAddress, status: WarehouseAddress["status"]) {
    const result = await updateRecordApi<WarehouseAddress>("warehouse", row.id, { status });
    setData((rows) => rows.map((item) => item.id === row.id ? result.data : item));
  }

  return (
    <div>
      <PageHeader title="仓库地址" desc={error || (loading ? "正在从后端加载仓库地址..." : "管理员统一维护仓库地址，客户可提交地址资料；买手回填时从已启用地址中下拉选择。")} actions={<button className="primary-btn flex items-center gap-2"><Plus size={18} />新增地址</button>} />
      <FilterBar>
        <SelectFilter label="状态" options={["启用", "待审核", "停用"]} />
        <SelectFilter label="州/地区" options={["CA", "NY", "TX", "OR"]} />
      </FilterBar>
      <form className="panel mb-5 p-5" onSubmit={submit}>
        <h2 className="text-lg font-black text-ink">美国地址编辑格式</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <Input name="name" label="仓库名称" placeholder="洛杉矶一号仓" required />
          <Input name="contactName" label="收货人" placeholder="Amy Johnson" required />
          <Input name="phone" label="电话" placeholder="+1 626 555 0188" />
          <Input label="国家" value="US" readOnly />
          <Input name="addressLine1" label="Address Line 1" placeholder="17888 Railroad St" />
          <Input name="addressLine2" label="Address Line 2" placeholder="Suite 208" />
          <Input name="city" label="City" placeholder="City of Industry" />
          <Input name="state" label="State" placeholder="CA" />
          <Input name="zipCode" label="ZIP Code" placeholder="91748" />
          <button className="primary-btn self-end">保存地址</button>
        </div>
      </form>
      <DataTable
        data={data}
        columns={[
          { key: "name", title: "仓库名称", render: (row) => row.name },
          { key: "owner", title: "维护方", render: (row) => row.owner },
          { key: "contact", title: "收货人", render: (row) => row.contactName },
          { key: "phone", title: "电话", render: (row) => row.phone },
          { key: "address", title: "美国地址", render: (row) => `${row.addressLine1}${row.addressLine2 ? `, ${row.addressLine2}` : ""}, ${row.city}, ${row.state} ${row.zipCode}` },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => setStatus(row, "待审核")}>编辑</button><button className="ghost-btn" onClick={() => setStatus(row, "启用")}>设为启用</button><button className="ghost-btn" onClick={() => setStatus(row, "停用")}>停用</button></div> },
        ]}
      />
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input {...inputProps} className="soft-input h-12 w-full px-4" /></label>;
}
