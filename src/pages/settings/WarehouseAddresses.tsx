import { Plus } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { warehouseAddresses } from "../../data/mockData";

export function WarehouseAddresses() {
  return (
    <div>
      <PageHeader title="仓库地址" desc="管理员统一维护仓库地址，客户可提交地址资料；买手回填时从已启用地址中下拉选择。" actions={<button className="primary-btn flex items-center gap-2"><Plus size={18} />新增地址</button>} />
      <FilterBar>
        <SelectFilter label="状态" options={["启用", "待审核", "停用"]} />
        <SelectFilter label="州/地区" options={["CA", "NY", "TX", "OR"]} />
      </FilterBar>
      <section className="panel mb-5 p-5">
        <h2 className="text-lg font-black text-ink">美国地址编辑格式</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <Input label="仓库名称" placeholder="洛杉矶一号仓" />
          <Input label="收货人" placeholder="Amy Johnson" />
          <Input label="电话" placeholder="+1 626 555 0188" />
          <Input label="国家" value="US" readOnly />
          <Input label="Address Line 1" placeholder="17888 Railroad St" />
          <Input label="Address Line 2" placeholder="Suite 208" />
          <Input label="City" placeholder="City of Industry" />
          <Input label="State" placeholder="CA" />
          <Input label="ZIP Code" placeholder="91748" />
          <button className="primary-btn self-end">保存地址</button>
        </div>
      </section>
      <DataTable
        data={warehouseAddresses}
        columns={[
          { key: "name", title: "仓库名称", render: (row) => row.name },
          { key: "owner", title: "维护方", render: (row) => row.owner },
          { key: "contact", title: "收货人", render: (row) => row.contactName },
          { key: "phone", title: "电话", render: (row) => row.phone },
          { key: "address", title: "美国地址", render: (row) => `${row.addressLine1}${row.addressLine2 ? `, ${row.addressLine2}` : ""}, ${row.city}, ${row.state} ${row.zipCode}` },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: () => <div className="flex gap-2"><button className="ghost-btn">编辑</button><button className="ghost-btn">设为启用</button></div> },
        ]}
      />
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input {...inputProps} className="soft-input h-12 w-full px-4" /></label>;
}
