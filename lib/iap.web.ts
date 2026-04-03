/**
 * Web version of IAP — in-app purchases are not supported on web.
 */

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

export async function initIAP(): Promise<boolean> {
  return false;
}

export async function getRemoveAdsProduct(): Promise<any | null> {
  return null;
}

export async function purchaseRemoveAds(): Promise<PurchaseResult> {
  return { success: false, error: "In-app purchases not available on web" };
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}

export async function endIAP(): Promise<void> {}
