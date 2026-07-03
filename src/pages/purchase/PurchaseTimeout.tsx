import { GenericTablePage } from "../common/GenericTablePage";

export function PurchaseTimeout() {
  return <GenericTablePage title="超时提醒" desc="超过采购截止时间但未完成的采购任务。" variant="tasks" />;
}
