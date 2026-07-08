import type { LucideIcon } from "lucide-react";

export type Role = "admin" | "buyer" | "warehouse" | "customer";

export type User = {
  username: string;
  displayName: string;
  role: Role;
};

export type PaymentStatus = "unpaid" | "paid_pending_confirm" | "confirmed_received";
export type PackageStatus = "in_transit" | "received" | "eta_overdue" | "exception";
export type ExceptionResolution = "refund" | "next_credit";
export type ExceptionStatus = "pending" | "processing" | "resolved";

export type NavItem = {
  title: string;
  path?: string;
  icon?: LucideIcon;
  roles: Role[];
  children?: NavItem[];
};

export type PurchaseTask = {
  id: string;
  productId?: string;
  requester: string;
  source: "管理员发布" | "客户发布";
  productName: string;
  image: string;
  spec?: string;
  targetPrice: number;
  quantity: number;
  accepted: number;
  purchased: number;
  arrived: number;
  deadline: string;
  status: string;
  customerPayStatus?: string;
  customerPaidAmount?: number;
  customerPaidAt?: string;
  overdue: boolean;
  buyer: string;
  requirement: string;
  warehouse: string;
  recipient: string;
};

export type PackageItem = {
  id: string;
  carrier: "UPS" | "FedEx" | "USPS";
  trackingNo: string;
  owner?: string;
  importBatchNo?: string;
  buyer: string;
  product: string;
  expectedAt: string;
  receivedAt?: string;
  status: string;
  warehouse: string;
  recipient: string;
  productQty: number;
  linkedPurchases: number;
  paidAmount: number;
  paidPendingConfirmAmount: number;
  inboundCost: number;
  exceptionAmount: number;
  photoCount?: number;
  note?: string;
  paymentStatus: PaymentStatus;
  overdue: boolean;
};

export type BuyerFillRecord = {
  id: string;
  orderId: string;
  packageId?: string;
  packageIds?: string[];
  buyer: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  settlement: number;
  overPrice: boolean;
  trackingNo: string;
  recipient: string;
  warehouse: string;
  warehouseEta?: string;
  auditStatus: string;
  payStatus: string;
};

export type ProductProfile = {
  id: string;
  name: string;
  image?: string;
  sourceUrl?: string;
  category: string;
  brand: string;
  spec: string;
  owner: string;
  referencePrice: number;
  status: "启用" | "待审核" | "停用";
  updatedAt: string;
};

export type WarehouseAddress = {
  id: string;
  name: string;
  owner: string;
  contactName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: "US";
  status: "启用" | "待审核" | "停用";
};

export type PackageException = {
  id: string;
  packageId: string;
  trackingNo: string;
  carrier: PackageItem["carrier"];
  buyer: string;
  product: string;
  reason: string;
  owner: string;
  amount: number;
  resolution: ExceptionResolution;
  status: ExceptionStatus;
  evidence: string;
  note: string;
  createdAt: string;
};

export type ReconciliationRecord = {
  id: string;
  period: string;
  paidPendingConfirmAmount: number;
  inboundCost: number;
  exceptionAmount: number;
  status: "待确认" | "已完成";
};
