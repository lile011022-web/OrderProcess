import { Plus, Save, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { Toast } from "../../components/Toast";
import { UploadBox } from "../../components/UploadBox";
import { Field, FormCard, NumberField } from "../purchase/NewPurchaseTask";
import { inferCarrier } from "../../data/carrierConfig";
import { warehouseAddresses } from "../../data/mockData";
import { apiRequest, uploadFileApi } from "../../utils/api";
import { requireCurrentUser } from "../../utils/auth";
import { currency } from "../../utils/format";

type PackageDraft = {
  id: string;
  trackingNo: string;
  quantity: number;
  warehouse: string;
  recipient: string;
  warehouseEta: string;
};

const defaultPackageDraft = (quantity = 1): PackageDraft => ({
  id: `pkg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  trackingNo: "1Z999AA10123456784",
  quantity,
  warehouse: "洛杉矶一号仓",
  recipient: "",
  warehouseEta: "",
});

export function BuyerFill() {
  const user = requireCurrentUser();
  const [qty, setQty] = useState(16);
  const [price, setPrice] = useState(1658);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [service, setService] = useState(0);
  const [platformOrderNo, setPlatformOrderNo] = useState("");
  const [packageDrafts, setPackageDrafts] = useState<PackageDraft[]>([defaultPackageDraft(16)]);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const productAmount = useMemo(() => qty * price, [qty, price]);
  const settlement = productAmount + tax + shipping + service;
  const platformOrderNumbers = platformOrderNo
    .split(/[\s,，、\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const packageQuantity = packageDrafts.reduce((total, item) => total + item.quantity, 0);

  function updatePackage(id: string, patch: Partial<PackageDraft>) {
    setPackageDrafts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addPackage() {
    setPackageDrafts((current) => [...current, defaultPackageDraft(Math.max(1, qty - current.reduce((total, item) => total + item.quantity, 0)))]);
    setToast("已新增一个包裹录入区；每个包裹会按自己的运单号生成包裹记录");
    setTimeout(() => setToast(""), 2200);
  }

  function removePackage(id: string) {
    setPackageDrafts((current) => current.length <= 1 ? current : current.filter((item) => item.id !== id));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ data: { id: string }; message: string }>("/api/buyer-fill-records", {
        method: "POST",
        body: JSON.stringify({
          orderId: form.get("orderId"),
          buyer: user.displayName,
          productName: form.get("productName"),
          quantity: qty,
          unitPrice: price,
          tax,
          domesticShipping: shipping,
          serviceFee: service,
          settlement,
          overPrice: false,
          platform: form.get("platform"),
          platformOrderNo,
          note: form.get("note"),
          recipient: packageDrafts[0]?.recipient || "",
          warehouse: packageDrafts[0]?.warehouse || "",
          warehouseEta: packageDrafts[0]?.warehouseEta || "",
          trackingNo: packageDrafts[0]?.trackingNo || "",
          packages: packageDrafts.map((item) => ({
            trackingNo: item.trackingNo,
            quantity: item.quantity,
            warehouse: item.warehouse,
            recipient: item.recipient,
            warehouseEta: item.warehouseEta,
          })),
          auditStatus: "待审核",
          payStatus: "待付款",
        }),
      });
      const files = Object.values(proofFiles).filter((file): file is File => Boolean(file));
      await Promise.all(files.map((file) => uploadFileApi("buyerFillRecord", result.data.id, file)));
      setToast(files.length ? `采购回填已提交，已上传 ${files.length} 个凭证并生成包裹` : "采购回填已提交，包裹已生成");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "提交回填失败");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 2200);
    }
  }

  return (
    <div>
      <PageHeader title="买手采购回填" desc="买手采购完成后回填订单、费用、物流和截图凭证。" />
      <form className="space-y-5" onSubmit={submit}>
        <FormCard title="采购信息">
          <Field name="orderId" label="接单编号" placeholder="ORD-8801" required />
          <Field name="productName" label="商品名称" placeholder="2024 Bowman Chrome Hobby Box" required />
          <NumberField label="实际采购数量" value={qty} onChange={setQty} />
          <NumberField label="实际采购单价" value={price} onChange={setPrice} />
          <div className="rounded-3xl bg-sky-50 p-4"><p className="text-sm font-bold text-sky-700">商品金额</p><p className="mt-2 text-xl font-black text-sky-900">{currency(productAmount)}</p></div>
          <NumberField label="税费" value={tax} onChange={setTax} />
          <NumberField label="美国境内运费" value={shipping} onChange={setShipping} />
          <NumberField label="买手服务费" value={service} onChange={setService} />
          <div className="rounded-3xl bg-violet-50 p-4"><p className="text-sm font-bold text-violet-700">结算金额</p><p className="mt-2 text-xl font-black text-violet-900">{currency(settlement)}</p></div>
          <Field name="platform" label="采购平台" defaultValue="whatnot" placeholder="whatnot" />
          <Field name="platformOrderNo" label="平台订单号" value={platformOrderNo} onChange={(event) => setPlatformOrderNo(event.currentTarget.value)} placeholder="多个订单号可用空格、逗号或换行分隔" />
          <div className="rounded-3xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">订单合并关系</p>
            <p className="mt-2 text-sm font-black text-emerald-900">{platformOrderNumbers.length || 1} 个平台订单号可合并到同一个包裹</p>
          </div>
          <Field name="note" label="采购备注" textarea placeholder="订单拆分、超价原因或卖家说明" />
        </FormCard>
        <FormCard title="物流信息">
          <div className="col-span-4 rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-ink">包裹分组</p>
                <p className="mt-1 text-xs font-bold text-slate-500">同一个运单号代表同一个包裹；多个平台订单号可以合并在该包裹内。拆成多个物流包裹时，点击添加包裹。</p>
              </div>
              <button type="button" className="primary-btn flex items-center gap-2" onClick={addPackage}><Plus size={18} />添加包裹</button>
            </div>
            <div className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-black text-slate-600">
              已录入 {packageDrafts.length} 个包裹，包裹数量合计 {packageQuantity}，采购数量 {qty}
            </div>
          </div>
          {packageDrafts.map((item, index) => (
            <div key={item.id} className="col-span-4 rounded-3xl border border-slate-100 bg-white/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-black text-ink">包裹 {index + 1}</p>
                <button type="button" className="ghost-btn flex items-center gap-2 py-2" disabled={packageDrafts.length <= 1} onClick={() => removePackage(item.id)}><Trash2 size={16} />删除</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-600">运单号</span>
                  <input value={item.trackingNo} onChange={(event) => updatePackage(item.id, { trackingNo: event.target.value })} className="soft-input h-12 w-full px-4" placeholder="1Z999AA10123456784" />
                </label>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">系统识别快递公司</p>
                  <p className="mt-2 text-lg font-black text-ink">{inferCarrier(item.trackingNo) ?? "待识别"}</p>
                </div>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-600">包裹内数量</span>
                  <input inputMode="numeric" value={String(item.quantity)} onChange={(event) => updatePackage(item.id, { quantity: normalizeWholeNumber(event.target.value) })} className="soft-input h-12 w-full px-4" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-600">收货仓库</span>
                  <select value={item.warehouse} onChange={(event) => updatePackage(item.id, { warehouse: event.target.value })} className="soft-input h-12 w-full px-4">
                    {warehouseAddresses.filter((address) => address.status !== "停用").map((address) => <option key={address.id}>{address.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-600">收货人</span>
                  <input value={item.recipient} onChange={(event) => updatePackage(item.id, { recipient: event.target.value })} className="soft-input h-12 w-full px-4" placeholder="买手填写收货人姓名" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-600">预计到仓</span>
                  <input type="datetime-local" value={item.warehouseEta} onChange={(event) => updatePackage(item.id, { warehouseEta: event.target.value })} className="soft-input h-12 w-full px-4" />
                </label>
              </div>
            </div>
          ))}
        </FormCard>
        <FormCard title="上传区域">
          <UploadBox label="采购截图" required accept="image/*,application/pdf" onFileChange={(file) => setProofFiles((current) => ({ ...current, purchase: file }))} />
          <UploadBox label="订单截图" accept="image/*,application/pdf" onFileChange={(file) => setProofFiles((current) => ({ ...current, order: file }))} />
          <UploadBox label="运单截图" accept="image/*,application/pdf" onFileChange={(file) => setProofFiles((current) => ({ ...current, tracking: file }))} />
        </FormCard>
        <div className="flex justify-end gap-3">
          <button type="button" className="ghost-btn flex items-center gap-2" onClick={() => setToast("采购回填草稿已保留在当前页面，可继续编辑后提交")}><Save size={18} />保存草稿</button>
          <button disabled={saving} className="primary-btn flex items-center gap-2"><Send size={18} />{saving ? "提交中..." : "提交审核"}</button>
        </div>
      </form>
      <Toast message={toast} />
    </div>
  );
}

function normalizeWholeNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Number(digits.replace(/^0+(?=\d)/, ""));
}
