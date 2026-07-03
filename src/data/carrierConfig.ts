export const carrierConfig = {
  UPS: {
    code: "UPS",
    name: "UPS",
    trackingUrlTemplate: "https://www.ups.com/track?tracknum={trackingNo}",
  },
  FedEx: {
    code: "FedEx",
    name: "FedEx",
    trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={trackingNo}",
  },
  USPS: {
    code: "USPS",
    name: "USPS",
    trackingUrlTemplate: "https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNo}",
  },
} as const;

export type CarrierCode = keyof typeof carrierConfig;

export function inferCarrier(trackingNo: string): CarrierCode | null {
  const value = trackingNo.trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return null;
  if (/^1Z[0-9A-Z]{16}$/.test(value)) return "UPS";
  if (/^(96\d{20,22}|94\d{20,22}|92\d{20,22}|93\d{20,22}|95\d{20,22}|420\d{5,9}\d{20,22})$/.test(value)) return "USPS";
  if (/^(\d{12}|\d{15}|\d{20}|\d{22})$/.test(value)) return "FedEx";
  return null;
}

export function getTrackingUrl(carrier: CarrierCode, trackingNo: string): string | null;
export function getTrackingUrl(trackingNo: string, carrier?: CarrierCode | null): string | null;
export function getTrackingUrl(first: string, second?: string | null) {
  const firstAsCarrier = first in carrierConfig ? (first as CarrierCode) : null;
  const trackingNo = firstAsCarrier ? second ?? "" : first;
  const resolvedCarrier = firstAsCarrier ?? (second as CarrierCode | null | undefined) ?? inferCarrier(trackingNo);
  if (!resolvedCarrier || !trackingNo.trim()) return null;
  return carrierConfig[resolvedCarrier].trackingUrlTemplate.replace("{trackingNo}", encodeURIComponent(trackingNo.trim()));
}

export function openTracking(carrier: CarrierCode, trackingNo: string) {
  const url = getTrackingUrl(trackingNo, carrier);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openTrackingByNumber(trackingNo: string) {
  const url = getTrackingUrl(trackingNo);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
