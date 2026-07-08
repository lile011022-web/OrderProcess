import { Ban, CheckCircle2, ExternalLink, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { DataTable } from "../../components/DataTable";
import { FilterBar, SelectFilter } from "../../components/FilterBar";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { Toast } from "../../components/Toast";
import { productProfiles } from "../../data/mockData";
import type { ProductProfile } from "../../types";
import { createRecordApi, deleteRecordApi, updateRecordApi } from "../../utils/api";
import { currency } from "../../utils/format";
import { useApiList } from "../../utils/useApiList";

type ProductForm = {
  name: string;
  image: string;
  sourceUrl: string;
  category: string;
  brand: string;
  spec: string;
  referencePrice: string;
  status: ProductProfile["status"];
};

const emptyForm: ProductForm = {
  name: "",
  image: "",
  sourceUrl: "",
  category: "",
  brand: "",
  spec: "",
  referencePrice: "",
  status: "启用",
};

export function ProductLibrary() {
  const { data, loading, error, setData } = useApiList<ProductProfile>("/api/products", productProfiles);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductProfile | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [toast, setToast] = useState("");

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditForm(row: ProductProfile) {
    setEditing(row);
    setForm({
      name: row.name,
      image: row.image || "",
      sourceUrl: row.sourceUrl || "",
      category: row.category,
      brand: row.brand,
      spec: row.spec,
      referencePrice: String(row.referencePrice),
      status: row.status,
    });
    setFormOpen(true);
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      image: form.image,
      sourceUrl: form.sourceUrl.trim(),
      category: form.category.trim(),
      brand: form.brand.trim(),
      spec: form.spec.trim(),
      referencePrice: Number(form.referencePrice || 0),
      status: form.status,
    };
    if (!payload.name) return showToast("请填写商品名称");
    if (!Number.isFinite(payload.referencePrice) || payload.referencePrice < 0) return showToast("参考价必须是大于等于 0 的数字");

    setSaving(true);
    try {
      if (editing) {
        const result = await updateRecordApi<ProductProfile>("product", editing.id, payload);
        setData((rows) => rows.map((item) => item.id === editing.id ? result.data : item));
        showToast("商品资料已保存");
      } else {
        const result = await createRecordApi<ProductProfile>("product", payload);
        setData((rows) => [result.data, ...rows]);
        showToast("商品资料已新增");
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : "保存商品失败");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(row: ProductProfile, status: ProductProfile["status"]) {
    try {
      const result = await updateRecordApi<ProductProfile>("product", row.id, { status });
      setData((rows) => rows.map((item) => item.id === row.id ? result.data : item));
      showToast(`商品状态已更新为${status}`);
    } catch (statusError) {
      showToast(statusError instanceof Error ? statusError.message : "更新状态失败");
    }
  }

  async function deleteProduct(row: ProductProfile) {
    if (!window.confirm(`确认删除商品「${row.name}」吗？删除后不会出现在发布采购任务的商品下拉里。`)) return;
    setDeletingId(row.id);
    try {
      await deleteRecordApi<ProductProfile>("product", row.id);
      setData((rows) => rows.filter((item) => item.id !== row.id));
      showToast("商品资料已删除");
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : "删除商品失败");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div>
      <PageHeader title="商品库" desc={error || (loading ? "正在从后端加载商品资料..." : "管理员维护或审核客户上传的商品基础资料，不承载采购、付款或仓库处理流程。")} actions={<button className="primary-btn flex items-center gap-2" onClick={openCreateForm}><Plus size={18} />新增商品</button>} />
      <FilterBar>
        <SelectFilter label="状态" options={["启用", "待审核", "停用"]} />
        <SelectFilter label="资料来源" options={["管理员", "客户上传"]} />
      </FilterBar>
      <DataTable
        data={data}
        columns={[
          { key: "image", title: "照片", render: (row) => row.image ? <img src={row.image} alt={row.name} className="h-14 w-14 rounded-2xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-xs font-black text-slate-400">无图</div> },
          {
            key: "product",
            title: "商品资料",
            render: (row) => (
              <div className="min-w-60 space-y-2">
                <p className="text-base font-black leading-snug text-slate-800">{row.name}</p>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{row.id}</p>
                <div className="flex flex-wrap gap-2 text-xs font-black text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{row.category || "未分类"}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{row.brand || "未填品牌"}</span>
                </div>
              </div>
            ),
          },
          { key: "spec", title: "基础规格", render: (row) => <span className="block max-w-72 leading-relaxed text-slate-600">{row.spec || "未填写规格"}</span> },
          {
            key: "source",
            title: "来源",
            render: (row) => (
              <div className="space-y-2">
                <p className="font-black text-slate-700">{row.owner}</p>
                {row.sourceUrl ? (
                  <a className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-100" href={row.sourceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} /> 商品链接
                  </a>
                ) : <span className="text-xs font-bold text-slate-400">无链接</span>}
              </div>
            ),
          },
          {
            key: "priceStatus",
            title: "价格 / 状态",
            render: (row) => (
              <div className="min-w-24 space-y-2">
                <p className="text-base font-black text-slate-800">{currency(row.referencePrice)}</p>
                <StatusBadge>{row.status}</StatusBadge>
              </div>
            ),
          },
          {
            key: "actions",
            title: "操作",
            render: (row) => (
              <div className="flex min-w-56 flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <ProductActionButton icon={<Pencil size={15} />} label="编辑" onClick={() => openEditForm(row)} />
                  <ProductActionButton icon={<Trash2 size={15} />} label={deletingId === row.id ? "删除中" : "删除"} tone="danger" disabled={deletingId === row.id} onClick={() => deleteProduct(row)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ProductActionButton icon={<CheckCircle2 size={15} />} label="启用" onClick={() => setStatus(row, "启用")} />
                  <ProductActionButton icon={<Ban size={15} />} label="停用" onClick={() => setStatus(row, "停用")} />
                </div>
              </div>
            ),
          },
        ]}
      />
      <Modal open={formOpen} title={editing ? "编辑商品资料" : "新增商品资料"} onClose={() => setFormOpen(false)}>
        <form onSubmit={saveProduct} className="space-y-4">
          <ProductImageInput image={form.image} onChange={(image) => setForm((current) => ({ ...current, image }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="商品名称" value={form.name} placeholder="例如 2025/26 Bowman Hobby" onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Input label="分类" value={form.category} placeholder="篮球卡盒 / 棒球卡盒" onChange={(value) => setForm((current) => ({ ...current, category: value }))} />
            <Input label="品牌" value={form.brand} placeholder="Topps / Panini / Bowman" onChange={(value) => setForm((current) => ({ ...current, brand: value }))} />
            <Input label="参考价" type="number" value={form.referencePrice} placeholder="0" onChange={(value) => setForm((current) => ({ ...current, referencePrice: value }))} />
          </div>
          <Input label="商品链接" value={form.sourceUrl} placeholder="https://www.dacardworld.com/..." onChange={(value) => setForm((current) => ({ ...current, sourceUrl: value }))} />
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-600">基础规格</span>
            <textarea value={form.spec} onChange={(event) => setForm((current) => ({ ...current, spec: event.target.value }))} className="soft-input min-h-24 w-full p-4" placeholder="盒 / 箱 / 张 / case / lot，或商品验收要求" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-600">状态</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProductProfile["status"] }))} className="soft-input h-12 w-full px-4 font-bold">
              <option value="启用">启用</option>
              <option value="待审核">待审核</option>
              <option value="停用">停用</option>
            </select>
          </label>
          <div className="sticky bottom-0 -mx-1 bg-white/95 pt-3">
            <button className="primary-btn w-full" disabled={saving}>{saving ? "保存中..." : "保存商品资料"}</button>
          </div>
        </form>
      </Modal>
      <Toast message={toast} />
    </div>
  );
}

function ProductActionButton({ icon, label, tone = "default", disabled = false, onClick }: { icon: ReactNode; label: string; tone?: "default" | "danger"; disabled?: boolean; onClick: () => void }) {
  const toneClass = tone === "danger"
    ? "text-rose-600 hover:border-rose-200 hover:bg-rose-50"
    : "text-slate-700 hover:border-teal-100 hover:bg-teal-50";
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/75 px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProductImageInput({ image, onChange }: { image: string; onChange: (image: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-600">商品照片</p>
      <label className="flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white/70 text-slate-500">
        {image ? <img src={image} alt="商品照片预览" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-sm font-bold"><ImagePlus size={26} />上传商品照片</span>}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result || ""));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {image && <button type="button" className="ghost-btn mt-3" onClick={() => onChange("")}>移除照片</button>}
    </div>
  );
}

function Input({ label, value, placeholder, type = "text", onChange }: { label: string; value: string; placeholder?: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="soft-input h-12 w-full px-4" />
    </label>
  );
}
