import { Save, Send, X } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { Toast } from "../../components/Toast";
import { UploadBox } from "../../components/UploadBox";
import { apiRequest } from "../../utils/api";
import { currency } from "../../utils/format";
import { requireCurrentUser } from "../../utils/auth";

export function NewPurchaseTask() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = requireCurrentUser();
  const isCustomerTask = location.pathname.startsWith("/customer/");
  const [quantity, setQuantity] = useState(80);
  const [price, setPrice] = useState(1680);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const budget = useMemo(() => quantity * price, [quantity, price]);

  async function saveTask(formElement: HTMLFormElement, status = "已发布") {
    setSaving(true);
    const form = new FormData(formElement);
    try {
      const deadline = String(form.get("deadline") || "");
      await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          requester: user.displayName,
          productName: form.get("productName"),
          image: String(form.get("image") || "https://images.unsplash.com/photo-1607242792481-37f27e1d74e1?auto=format&fit=crop&w=420&q=80"),
          targetPrice: price,
          quantity,
          deadline: deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
          status,
          requirement: [form.get("condition"), form.get("platform"), form.get("note")].filter(Boolean).join("；"),
          warehouse: form.get("warehouse"),
          recipient: form.get("recipient"),
        }),
      });
      setToast(status === "草稿" ? "采购任务草稿已保存" : "采购任务已发布");
      setTimeout(() => navigate(isCustomerTask ? "/customer/tasks" : "/purchase/tasks"), 700);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "保存采购任务失败");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 2200);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveTask(event.currentTarget, "已发布");
  }

  return (
    <div>
      <PageHeader
        title={isCustomerTask ? "客户发布采购任务" : "发布采购任务"}
        desc={isCustomerTask ? "客户提交采购需求后，任务进入大厅等待买手接单；管理员可在全局任务列表查看进度。" : "管理员发布采购目标后，买手可在任务大厅主动接单。"}
      />
      <form className="space-y-5" onSubmit={submit}>
        <FormCard title="基础信息">
          <Field name="productName" label="商品名称" placeholder="2024 Bowman Chrome Hobby Box" required />
          <UploadBox label="商品图片上传" />
          <Field name="spec" label="商品规格" placeholder="盒 / 箱 / 张 / case / lot" />
          <Field name="year" label="年份" placeholder="2024" />
          <Field name="series" label="系列" placeholder="Bowman / Prizm / Topps" />
          <NumberField label="采购数量" value={quantity} onChange={setQuantity} />
          <NumberField label="目标单价" value={price} onChange={setPrice} />
          <div className="rounded-3xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-700">预计总预算</p><p className="mt-2 text-2xl font-black text-emerald-900">{currency(budget)}</p></div>
        </FormCard>
        <FormCard title="采购要求">
          <Field name="condition" label="盒况要求" placeholder="不要盒损、必须未拆封" />
          <Field name="platform" label="平台要求" placeholder="eBay、Whatnot、线下等" />
          <Field name="note" label="采购备注" placeholder="特殊采购说明" textarea />
          <Toggle label="是否允许超价" />
          <Toggle label="超价是否需要审核" defaultChecked />
        </FormCard>
        <FormCard title="收货信息">
          <Field name="warehouse" label="收货仓库" placeholder={isCustomerTask ? "纽约中转仓" : "洛杉矶一号仓"} required />
          <Field name="recipient" label="收货人" placeholder={isCustomerTask ? "Ben Miller" : "Warehouse Amy"} required />
          <Field name="address" label="收货地址" placeholder={isCustomerTask ? "41-20 39th St, Long Island City, NY 11104" : "1180 S Los Angeles St, Los Angeles, CA"} />
        </FormCard>
        <FormCard title="任务设置">
          <NumberField label="最小接单数量" value={5} onChange={() => undefined} />
          <NumberField label="最大接单数量" value={30} onChange={() => undefined} />
          <Field name="deadline" label="截止时间" type="datetime-local" />
          <Toggle label={isCustomerTask ? "提交后进入任务大厅" : "是否立即发布"} defaultChecked />
          <Field name="internalNote" label="任务备注" placeholder={isCustomerTask ? "客户内部备注或采购优先级" : "内部备注"} textarea />
        </FormCard>
        <div className="sticky bottom-5 flex justify-end gap-3 rounded-[26px] border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur-xl">
          <button type="button" className="ghost-btn flex items-center gap-2" onClick={() => navigate(-1)}><X size={18} />取消</button>
          <button type="button" disabled={saving} className="ghost-btn flex items-center gap-2" onClick={(event) => event.currentTarget.form && saveTask(event.currentTarget.form, "草稿")}><Save size={18} />保存草稿</button>
          <button disabled={saving} className="primary-btn flex items-center gap-2"><Send size={18} />{saving ? "提交中..." : isCustomerTask ? "提交并发布" : "发布任务"}</button>
        </div>
      </form>
      <Toast message={toast} />
    </div>
  );
}

export function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel p-6"><h2 className="mb-5 text-xl font-black text-ink">{title}</h2><div className="grid grid-cols-4 gap-5">{children}</div></section>;
}

export function Field({ label, placeholder, textarea, type = "text", ...props }: (InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>) & { label: string; placeholder?: string; textarea?: boolean; type?: string }) {
  return <label className={textarea ? "col-span-2" : ""}><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>{textarea ? <textarea {...props} className="soft-input min-h-28 w-full p-4" placeholder={placeholder} /> : <input {...props} type={type} className="soft-input h-12 w-full px-4" placeholder={placeholder} />}</label>;
}

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="soft-input h-12 w-full px-4" /></label>;
}

export function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return <label className="flex items-center justify-between rounded-3xl bg-slate-50 p-4 text-sm font-bold text-slate-700"><span>{label}</span><input type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-slate-900" /></label>;
}
