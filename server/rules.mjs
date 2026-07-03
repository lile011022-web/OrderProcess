export const USD_CNY_RATE = 6.8;
export const WAREHOUSE_PACKAGE_FEE_USD = 5;
export const PHOTO_FEE_USD = 0.5;

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
};

export function calculateWarehouseFee({ packageCount, photoCount }) {
  const packageFee = packageCount * WAREHOUSE_PACKAGE_FEE_USD;
  const photoFee = photoCount * PHOTO_FEE_USD;
  const usdTotal = packageFee + photoFee;
  return {
    packageFee,
    photoFee,
    usdTotal,
    cnyTotal: usdTotal * USD_CNY_RATE,
    exchangeRate: USD_CNY_RATE,
  };
}

export function inferCarrier(trackingNo) {
  const value = String(trackingNo ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return null;
  if (/^1Z[0-9A-Z]{16}$/.test(value)) return "UPS";
  if (/^(96\d{20,22}|94\d{20,22}|92\d{20,22}|93\d{20,22}|95\d{20,22}|420\d{5,9}\d{20,22})$/.test(value)) return "USPS";
  if (/^(\d{12}|\d{15}|\d{20}|\d{22})$/.test(value)) return "FedEx";
  return null;
}

export function getTrackingUrl({ carrier, trackingNo }) {
  const resolvedCarrier = carrier && carrierConfig[carrier] ? carrier : inferCarrier(trackingNo);
  if (!resolvedCarrier || !String(trackingNo ?? "").trim()) return null;
  return carrierConfig[resolvedCarrier].trackingUrlTemplate.replace("{trackingNo}", encodeURIComponent(String(trackingNo).trim()));
}
