export const USD_CNY_RATE = 6.8;
export const WAREHOUSE_PACKAGE_FEE_USD = 5;
export const PHOTO_FEE_USD = 0.5;

export function calculateWarehouseFee({ packageCount, photoCount }: { packageCount: number; photoCount: number }) {
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

export function calcWarehouseFee(packages: number, photos: number) {
  return calculateWarehouseFee({ packageCount: packages, photoCount: photos });
}
