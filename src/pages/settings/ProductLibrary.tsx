import { Plus } from "lucide-react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { productProfiles } from "../../data/mockData";
import type { ProductProfile } from "../../types";
import { createRecordApi, updateRecordApi } from "../../utils/api";
import { currency } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

export function ProductLibrary() {
  const { data, loading, error, setData } = useApiList<ProductProfile>("/api/products", productProfiles);

  async function addProduct() {
    const result = await createRecordApi<ProductProfile>("product", {
      name: "新商品资料",
      category: "待分类",
      brand: "待补充",
      spec: "请编辑商品规格",
      referencePrice: 0,
      status: "启用",
    });
    setData((rows) => [result.data, ...rows]);
  }

  async function setStatus(row: ProductProfile, status: ProductProfile["status"]) {
    const result = await updateRecordApi<ProductProfile>("product", row.id, { status });
    setData((rows) => rows.map((item) => item.id === row.id ? result.data : item));
  }

  return (
    <div>
      <PageHeader title="商品库" desc={error || (loading ? "正在从后端加载商品资料..." : "管理员维护或审核客户上传的商品基础资料，不承载采购、付款或仓库处理流程。")} actions={<button className="primary-btn flex items-center gap-2" onClick={addProduct}><Plus size={18} />新增商品</button>} />
      <FilterBar>
        <SelectFilter label="状态" options={["启用", "待审核", "停用"]} />
        <SelectFilter label="资料来源" options={["管理员", "客户上传"]} />
      </FilterBar>
      <DataTable
        data={data}
        columns={[
          { key: "id", title: "商品编码", render: (row) => row.id },
          { key: "name", title: "商品名称", render: (row) => row.name },
          { key: "category", title: "分类", render: (row) => row.category },
          { key: "brand", title: "品牌", render: (row) => row.brand },
          { key: "spec", title: "基础规格", render: (row) => row.spec },
          { key: "owner", title: "资料来源", render: (row) => row.owner },
          { key: "price", title: "参考价", render: (row) => currency(row.referencePrice) },
          { key: "status", title: "状态", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { key: "actions", title: "操作", render: (row) => <div className="flex gap-2"><button className="ghost-btn" onClick={() => setStatus(row, "待审核")}>编辑</button><button className="ghost-btn" onClick={() => setStatus(row, "启用")}>审核启用</button><button className="ghost-btn" onClick={() => setStatus(row, "停用")}>停用</button></div> },
        ]}
      />
    </div>
  );
}
