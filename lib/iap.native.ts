import { REMOVE_ADS_PRODUCT_ID } from "./ad-context";

let iapModule: any = null;

try {
  iapModule = require("expo-iap");
} catch {
  // expo-iap not available (e.g., Expo Go)
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

export async function initIAP(): Promise<boolean> {
  if (!iapModule) return false;
  try {
    const connected = await iapModule.setup();
    return !!connected;
  } catch (error) {
    console.log("IAP setup failed:", error);
    return false;
  }
}

export async function getRemoveAdsProduct(): Promise<any | null> {
  if (!iapModule) return null;
  try {
    const products = await iapModule.getProducts([REMOVE_ADS_PRODUCT_ID]);
    return products?.length > 0 ? products[0] : null;
  } catch (error) {
    console.log("Failed to get products:", error);
    return null;
  }
}

export async function purchaseRemoveAds(): Promise<PurchaseResult> {
  if (!iapModule) {
    return { success: false, error: "In-app purchases not available on this platform" };
  }

  try {
    const result = await iapModule.purchase({ itemType: "inapp", sku: REMOVE_ADS_PRODUCT_ID });
    if (result) {
      return { success: true };
    }
    return { success: false, error: "Purchase was cancelled" };
  } catch (error: any) {
    if (error?.code === "E_USER_CANCELLED" || error?.message?.includes("cancel")) {
      return { success: false, error: "Purchase cancelled" };
    }
    return { success: false, error: error?.message || "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!iapModule) return false;
  try {
    const purchases = await iapModule.getAvailablePurchases();
    if (purchases && purchases.length > 0) {
      const hasRemoveAds = purchases.some(
        (p: any) => p.productId === REMOVE_ADS_PRODUCT_ID
      );
      return hasRemoveAds;
    }
    return false;
  } catch (error) {
    console.log("Failed to restore purchases:", error);
    return false;
  }
}

export async function endIAP(): Promise<void> {}
