import { Save, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { UploadBox } from "../../components/UploadBox";
import { Field, FormCard, NumberField, Toggle } from "../purchase/NewPurchaseTask";
import { inferCarrier } from "../../data/carrierConfig";
import { warehouseAddresses } from "../../data/mockData";
import { currency } from "../../utils/format";

export function BuyerFill() {
  const [qty, setQty] = useState(16);
  const [price, setPrice] = useState(1658);
  const [tax, setTax] = useState(360);
  const [shipping, setShipping] = useState(420);
  const [service, setService] = useState(650);
  const [trackingNo, setTrackingNo] = useState("1Z999AA10123456784");
  const productAmount = useMemo(() => qty * price, [qty, price]);
  const settlement = productAmount + tax + shipping + service;
  const carrier = inferCarrier(trackingNo);
  return (
    <div>
      <PageHeader title="买手采购回填" desc="买手采购完成后回填订单、费用、物流和截图凭证。" />
      <div className="space-y-5">
        <FormCard title="采购信息">
          <Field label="接单编号" placeholder="ORD-8801" />
          <Field label="商品名称" placeholder="2024 Bowman Chrome Hobby Box" />
          <NumberField label="实际采购数量" value={qty} onChange={setQty} />
          <NumberField label="实际采购单价" value={price} onChange={setPrice} />
          <div className="rounded-3xl bg-sky-50 p-4"><p className="text-sm font-bold text-sky-700">商品金额</p><p className="mt-2 text-xl font-black text-sky-900">{currency(productAmount)}</p></div>
          <NumberField label="税费" value={tax} onChange={setTax} />
          <NumberField label="美国境内运费" value={shipping} onChange={setShipping} />
          <NumberField label="买手服务费" value={service} onChange={setService} />
          <div className="rounded-3xl bg-violet-50 p-4"><p className="text-sm font-bold text-violet-700">结算金额</p><p className="mt-2 text-xl font-black text-violet-900">{currency(settlement)}</p></div>
          <Field label="采购平台" placeholder="eBay" />
          <Field label="平台订单号" placeholder="EB-4456981" />
          <Field label="采购备注" textarea placeholder="订单拆分、超价原因或卖家说明" />
        </FormCard>
        <FormCard title="物流信息">
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-600">运单号</span>
            <input value={trackingNo} onChange={(event) => setTrackingNo(event.target.value)} className="soft-input h-12 w-full px-4" placeholder="1Z999AA10123456784" />
          </label>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-400">系统识别快递公司</p>
            <p className="mt-2 text-lg font-black text-ink">{carrier ?? "待识别"}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">买手只需填写运单号，预计到达时间由仓库端维护。</p>
          </div>
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-600">收货仓库</span>
            <select className="soft-input h-12 w-full px-4" defaultValue="洛杉矶一号仓">
              {warehouseAddresses.filter((item) => item.status !== "停用").map((item) => <option key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <Field label="收货人" placeholder="买手填写收货人姓名" />
          <Toggle label="是否多个包裹" />
          <button className="ghost-btn h-12 self-end">添加包裹</button>
        </FormCard>
        <FormCard title="上传区域">
          <UploadBox label="采购截图" required />
          <UploadBox label="订单截图" />
          <UploadBox label="运单截图" />
        </FormCard>
        <div className="flex justify-end gap-3">
          <button className="ghost-btn flex items-center gap-2"><Save size={18} />保存草稿</button>
          <button className="primary-btn flex items-center gap-2"><Send size={18} />提交审核</button>
        </div>
      </div>
    </div>
  );
}
