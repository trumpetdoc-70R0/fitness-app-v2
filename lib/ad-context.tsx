import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { isPremium, setPremium as savePremium } from "./storage";

// ============ Ad Unit IDs ============
// Test IDs for development, real IDs for production
const TEST_BANNER_ID_IOS = "ca-app-pub-3940256099942544/2934735716";
const TEST_BANNER_ID_ANDROID = "ca-app-pub-3940256099942544/6300978111";
const TEST_INTERSTITIAL_ID_IOS = "ca-app-pub-3940256099942544/4411468910";
const TEST_INTERSTITIAL_ID_ANDROID = "ca-app-pub-3940256099942544/1033173712";

// Real AdMob ad unit IDs
const PROD_BANNER_ID_IOS = "ca-app-pub-8066960436585279/4685130906";
const PROD_BANNER_ID_ANDROID = "ca-app-pub-8066960436585279/4685130906"; // TODO: Replace with Android-specific ID when created
const PROD_INTERSTITIAL_ID = "ca-app-pub-8066960436585279/7844910621";

const USE_TEST_ADS = __DEV__;

export const AD_UNIT_IDS = {
  banner: Platform.select({
    ios: USE_TEST_ADS ? TEST_BANNER_ID_IOS : PROD_BANNER_ID_IOS,
    android: USE_TEST_ADS ? TEST_BANNER_ID_ANDROID : PROD_BANNER_ID_ANDROID,
    default: TEST_BANNER_ID_ANDROID,
  }),
  interstitial: Platform.select({
    ios: USE_TEST_ADS ? TEST_INTERSTITIAL_ID_IOS : PROD_INTERSTITIAL_ID,
    android: USE_TEST_ADS ? TEST_INTERSTITIAL_ID_ANDROID : PROD_INTERSTITIAL_ID,
    default: TEST_INTERSTITIAL_ID_ANDROID,
  }),
};

// ============ Remove Ads Product ID ============
export const REMOVE_ADS_PRODUCT_ID = "gorep_remove_ads";

// ============ Context ============

interface AdContextType {
  isAdFree: boolean;
  isLoading: boolean;
  setAdFree: (value: boolean) => Promise<void>;
  showAds: boolean;
}

const AdContext = createContext<AdContextType>({
  isAdFree: false,
  isLoading: true,
  setAdFree: async () => {},
  showAds: true,
});

export function useAds() {
  return useContext(AdContext);
}

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [isAdFree, setIsAdFree] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  async function loadPremiumStatus() {
    try {
      const premium = await isPremium();
      setIsAdFree(premium);
    } catch {
      setIsAdFree(false);
    } finally {
      setIsLoading(false);
    }
  }

  const setAdFree = useCallback(async (value: boolean) => {
    await savePremium(value);
    setIsAdFree(value);
  }, []);

  // Don't show ads on web (AdMob doesn't support web)
  const showAds = !isAdFree && Platform.OS !== "web";

  return (
    <AdContext.Provider value={{ isAdFree, isLoading, setAdFree, showAds }}>
      {children}
    </AdContext.Provider>
  );
}
