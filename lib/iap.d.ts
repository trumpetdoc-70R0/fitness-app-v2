export interface PurchaseResult {
  success: boolean;
  error?: string;
}

export function initIAP(): Promise<boolean>;
export function getRemoveAdsProduct(): Promise<any | null>;
export function purchaseRemoveAds(): Promise<PurchaseResult>;
export function restorePurchases(): Promise<boolean>;
export function endIAP(): Promise<void>;
