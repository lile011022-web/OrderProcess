export function currency(value: number, symbol = "¥") {
  return `${symbol}${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function usd(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function dateText(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export const paymentStatusText = {
  unpaid: "待付款",
  paid_pending_confirm: "已付待确认",
  confirmed_received: "已确认入库",
} as const;

export const exceptionResolutionText = {
  refund: "退款",
  next_credit: "下次抵扣",
} as const;

export const exceptionStatusText = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已完成",
} as const;
