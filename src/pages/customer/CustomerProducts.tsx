import { Plus } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { productProfiles } from "../../data/mockData";
import type { ProductProfile } from "../../types";
import { createRecordApi, updateRecordApi } from "../../utils/api";
import { requireCurrentUser } from "../../utils/auth";
import { currency } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function CustomerProducts() {
  const user = requireCurrentUser();
  const { data: products, loading, error, setData } = useApiList<ProductProfile>(`/api/products?owner=${encodeURIComponent(user.displayName)}`, productProfiles.filter((item) => item.owner === user.displayName));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createRecordApi<ProductProfile>("product", {
      name: String(form.get("name") || ""),
      category: String(form.get("category") || ""),
      brand: String(form.get("brand") || ""),
      referencePrice: Number(form.get("referencePrice") || 0),
      spec: String(form.get("spec") || ""),
      status: "待审核",
    });
    setData((rows) => [result.data, ...rows]);
    event.currentTarget.reset();
  }

  async function resubmit(row: ProductProfile) {
    const result = await updateRecordApi<ProductProfile>("product", row.id, { status: "待审核" });
    setData((rows) => rows.map((item) => item.id === row.id ? result.data : item));
  }

  return (
    <div>
      <PageHeader
        title="我的商品资料"
        desc={error || (loading ? "正在从后端加载我的商品资料..." : "客户提交和维护自己的商品基础资料，提交后由管理员审核启用。")}
        actions={<button className="primary-btn flex items-center gap-2" onClick={() => document.getElementById("customer-product-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}><Plus size={18} />提交商品</button>}
      />
      <FilterBar>
        <SelectFilter label="审核状态" options={["待审核", "启用", "停用"]} />
        <SelectFilter label="商品分类" options={["篮球卡盒", "棒球卡盒", "足球卡盒"]} />
      </FilterBar>
      <form id="customer-product-form" className="panel mb-5 p-5" onSubmit={submit}>
        <h2 className="text-lg font-black text-ink">商品资料提交</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <Input name="name" label="商品名称" placeholder="2023-24 Prizm Basketball Mega" required />
          <Input name="category" label="分类" placeholder="篮球卡盒" />
          <Input name="brand" label="品牌" placeholder="Panini" />
          <Input name="referencePrice" label="参考价" type="number" placeholder="920" />
          <label className="col-span-3">
            <span className="mb-2 block text-sm font-bold text-slate-600">基础规格</span>
            <textarea name="spec" className="soft-input min-h-24 w-full p-4" placeholder="包装规格、盒况要求、是否需要照片等基础说明" />
          </label>
          <button className="primary-btn self-end">提交审核</button>
        </div>
      </form>
      <DataTable
        data={products}
        columns={[
          { key: "id", title: "商品编码", render: (row) => row.id },
          { key: "name", title: "商品名称", render: (row) => row.name },
          { key: "category", title: "分类", render: (row) => row.category },
          { key: "brand", title: "品牌", render: (row) => row.brand },
          { key: "spec", title: "基础规格", render: (row) => row.spec },
          { key: "price", title: "参考价", render: (row) => currency(row.referencePrice) },
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
