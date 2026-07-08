import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Home,
  PackageCheck,
  Settings,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import type { NavItem, Role, User } from "../types";

export const authUsers: Record<string, User & { password: string }> = {
  admin: { username: "admin", displayName: "管理员", role: "admin", password: "123456" },
  buyer: { username: "buyer", displayName: "Alex Chen", role: "buyer", password: "123456" },
  warehouse: { username: "warehouse", displayName: "仓库 Amy", role: "warehouse", password: "123456" },
  customer: { username: "customer", displayName: "客户 A", role: "customer", password: "123456" },
};

export const roleLabels: Record<Role, string> = {
  admin: "管理员",
  buyer: "买手",
  warehouse: "仓库",
  customer: "客户",
};

const admin: Role[] = ["admin"];
const warehouse: Role[] = ["admin", "warehouse"];
const customer: Role[] = ["customer"];

export const navItems: NavItem[] = [
  { title: "首页总览", path: "/dashboard", icon: Home, roles: admin },
  {
    title: "采购任务",
    icon: ClipboardList,
    roles: admin,
    children: [
      { title: "发布采购任务", path: "/purchase/tasks/new", roles: admin },
      { title: "采购任务列表", path: "/purchase/tasks", roles: admin },
      { title: "任务大厅", path: "/purchase/task-hall", roles: admin },
      { title: "接单记录", path: "/purchase/orders", roles: admin },
      { title: "超时提醒", path: "/purchase/timeout", roles: admin },
    ],
  },
  {
    title: "买手管理",
    icon: Users,
    roles: admin,
    children: [
      { title: "买手列表", path: "/buyers", roles: admin },
      { title: "买手采购回填", path: "/buyers/fill", roles: admin },
      { title: "买手付款", path: "/buyers/payments", roles: admin },
      { title: "买手往来账", path: "/buyers/ledger", roles: admin },
      { title: "退款 / 抵扣记录", path: "/buyers/deductions", roles: admin },
    ],
  },
  {
    title: "物流包裹",
    icon: Truck,
    roles: admin,
    children: [
      { title: "包裹列表", path: "/packages", roles: admin },
      { title: "在途包裹", path: "/packages/in-transit", roles: admin },
      { title: "预计到达提醒", path: "/packages/eta-alerts", roles: admin },
      { title: "包裹异常", path: "/packages/exceptions", roles: admin },
    ],
  },
  {
    title: "仓库收货",
    icon: PackageCheck,
    roles: warehouse,
    children: [
      { title: "待确认包裹", path: "/warehouse/pending", roles: warehouse },
      { title: "已收货包裹", path: "/warehouse/received", roles: warehouse },
      { title: "超时待核查", path: "/warehouse/overdue", roles: warehouse },
      { title: "仓库操作费", path: "/warehouse/fees", roles: admin },
    ],
  },
  {
    title: "财务对账",
    icon: CreditCard,
    roles: admin,
    children: [
      { title: "买手结算", path: "/finance/buyer-settlement", roles: admin },
      { title: "仓库结算", path: "/finance/warehouse-settlement", roles: admin },
      { title: "运费清关费", path: "/finance/shipping-clearance", roles: admin },
      { title: "成本核算", path: "/finance/costing", roles: admin },
      { title: "月度对账", path: "/finance/monthly", roles: admin },
    ],
  },
  {
    title: "报表中心",
    icon: BarChart3,
    roles: admin,
    children: [
      { title: "时间段采购统计", path: "/reports/purchase", roles: admin },
      { title: "买手采购统计", path: "/reports/buyer", roles: admin },
      { title: "商品成本统计", path: "/reports/product-cost", roles: admin },
      { title: "异常包裹统计", path: "/reports/exceptions", roles: admin },
      { title: "仓库费用统计", path: "/reports/warehouse-fees", roles: admin },
      { title: "最终成本统计", path: "/reports/final-cost", roles: admin },
    ],
  },
  {
    title: "基础资料",
    icon: Settings,
    roles: admin,
    children: [
      { title: "商品库", path: "/settings/products", roles: admin },
      { title: "买手资料", path: "/settings/buyers", roles: admin },
      { title: "仓库地址", path: "/settings/warehouses", roles: admin },
      { title: "快递公司配置", path: "/settings/carriers", roles: admin },
    ],
  },
  { title: "任务大厅", path: "/purchase/task-hall", icon: ClipboardList, roles: ["buyer"] },
  { title: "我的接单", path: "/purchase/orders", icon: ShoppingBag, roles: ["buyer"] },
  { title: "买手采购回填", path: "/buyers/fill", icon: Users, roles: ["buyer"] },
  { title: "我的收款状态", path: "/buyers/payments", icon: CreditCard, roles: ["buyer"] },
  {
    title: "客户资料",
    icon: Settings,
    roles: customer,
    children: [
      { title: "发布采购任务", path: "/customer/tasks/new", roles: customer },
      { title: "我的采购任务", path: "/customer/tasks", roles: customer },
      { title: "我的包裹", path: "/customer/packages", roles: customer },
      { title: "我的商品资料", path: "/customer/products", roles: customer },
      { title: "我的仓库地址", path: "/customer/warehouses", roles: customer },
    ],
  },
];

export function canAccess(role: Role, path: string) {
  if (path === "/dashboard") return role === "admin";
  const flat = navItems.flatMap((item) => item.children ?? [item]);
  return flat.some((item) => item.path === path && item.roles.includes(role));
}

export function defaultPathForRole(role: Role) {
  if (role === "buyer") return "/purchase/task-hall";
  if (role === "warehouse") return "/warehouse/pending";
  if (role === "customer") return "/customer/tasks";
  return "/dashboard";
}
