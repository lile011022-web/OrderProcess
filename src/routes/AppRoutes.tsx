import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { Login } from "../pages/Login";
import { Dashboard } from "../pages/Dashboard";
import { PurchaseTasks } from "../pages/purchase/PurchaseTasks";
import { NewPurchaseTask } from "../pages/purchase/NewPurchaseTask";
import { TaskHall } from "../pages/purchase/TaskHall";
import { PurchaseOrders } from "../pages/purchase/PurchaseOrders";
import { PurchaseTimeout } from "../pages/purchase/PurchaseTimeout";
import { Buyers } from "../pages/buyers/Buyers";
import { BuyerFill } from "../pages/buyers/BuyerFill";
import { BuyerPayments } from "../pages/buyers/BuyerPayments";
import { BuyerLedger } from "../pages/buyers/BuyerLedger";
import { BuyerDeductions } from "../pages/buyers/BuyerDeductions";
import { PackageList } from "../pages/packages/PackageList";
import { InTransitPackages } from "../pages/packages/InTransitPackages";
import { EtaAlerts } from "../pages/packages/EtaAlerts";
import { PackageExceptions } from "../pages/packages/PackageExceptions";
import { WarehousePending } from "../pages/warehouse/WarehousePending";
import { WarehouseReceived } from "../pages/warehouse/WarehouseReceived";
import { WarehouseOverdue } from "../pages/warehouse/WarehouseOverdue";
import { WarehouseFees } from "../pages/warehouse/WarehouseFees";
import { Costing } from "../pages/finance/Costing";
import { GenericTablePage } from "../pages/common/GenericTablePage";
import { ProductLibrary } from "../pages/settings/ProductLibrary";
import { WarehouseAddresses } from "../pages/settings/WarehouseAddresses";
import { CustomerProducts } from "../pages/customer/CustomerProducts";
import { CustomerWarehouses } from "../pages/customer/CustomerWarehouses";
import { CustomerTasks } from "../pages/customer/CustomerTasks";
import { CustomerPackages } from "../pages/customer/CustomerPackages";
import { getCurrentUser } from "../utils/auth";
import { defaultPathForRole } from "../utils/permissions";

function RootRedirect() {
  const user = getCurrentUser();
  return <Navigate to={user ? defaultPathForRole(user.role) : "/login"} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/purchase/tasks" element={<PurchaseTasks />} />
          <Route path="/purchase/tasks/new" element={<NewPurchaseTask />} />
          <Route path="/purchase/task-hall" element={<TaskHall />} />
          <Route path="/purchase/orders" element={<PurchaseOrders />} />
          <Route path="/purchase/timeout" element={<PurchaseTimeout />} />
          <Route path="/buyers" element={<Buyers />} />
          <Route path="/buyers/fill" element={<BuyerFill />} />
          <Route path="/buyers/payments" element={<BuyerPayments />} />
          <Route path="/buyers/ledger" element={<BuyerLedger />} />
          <Route path="/buyers/deductions" element={<BuyerDeductions />} />
          <Route path="/packages" element={<PackageList />} />
          <Route path="/packages/in-transit" element={<InTransitPackages />} />
          <Route path="/packages/eta-alerts" element={<EtaAlerts />} />
          <Route path="/packages/exceptions" element={<PackageExceptions />} />
          <Route path="/warehouse/pending" element={<WarehousePending />} />
          <Route path="/warehouse/received" element={<WarehouseReceived />} />
          <Route path="/warehouse/overdue" element={<WarehouseOverdue />} />
          <Route path="/warehouse/fees" element={<WarehouseFees />} />
          <Route path="/finance/buyer-settlement" element={<GenericTablePage title="买手结算" variant="finance" />} />
          <Route path="/finance/warehouse-settlement" element={<GenericTablePage title="仓库结算" variant="finance" />} />
          <Route path="/finance/shipping-clearance" element={<GenericTablePage title="运费清关费" desc="第一版手动录入运费与清关费。" variant="finance" />} />
          <Route path="/finance/costing" element={<Costing />} />
          <Route path="/finance/monthly" element={<GenericTablePage title="月度对账" variant="finance" />} />
          <Route path="/reports/purchase" element={<GenericTablePage title="时间段采购统计" variant="reports" />} />
          <Route path="/reports/buyer" element={<GenericTablePage title="买手采购统计" variant="reports" />} />
          <Route path="/reports/product-cost" element={<GenericTablePage title="商品成本统计" variant="reports" />} />
          <Route path="/reports/exceptions" element={<GenericTablePage title="异常包裹统计" variant="reports" />} />
          <Route path="/reports/warehouse-fees" element={<GenericTablePage title="仓库费用统计" variant="reports" />} />
          <Route path="/reports/final-cost" element={<GenericTablePage title="最终成本统计" variant="reports" />} />
          <Route path="/settings/products" element={<ProductLibrary />} />
          <Route path="/settings/buyers" element={<GenericTablePage title="买手资料" variant="settings" />} />
          <Route path="/settings/warehouses" element={<WarehouseAddresses />} />
          <Route path="/settings/carriers" element={<GenericTablePage title="快递公司配置" desc="UPS、FedEx、USPS 官网查询地址集中维护。" variant="settings" />} />
          <Route path="/customer/tasks" element={<CustomerTasks />} />
          <Route path="/customer/tasks/new" element={<NewPurchaseTask />} />
          <Route path="/customer/packages" element={<CustomerPackages />} />
          <Route path="/customer/products" element={<CustomerProducts />} />
          <Route path="/customer/warehouses" element={<CustomerWarehouses />} />
        </Route>
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
