import { GenericTablePage } from "../common/GenericTablePage";

export function InTransitPackages() {
  return <GenericTablePage title="在途包裹" desc="已生成运单但仓库尚未确认收到的包裹。" variant="packages" />;
}
