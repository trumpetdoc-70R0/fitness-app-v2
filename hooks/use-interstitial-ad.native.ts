import { useCallback, useEffect, useRef, useState } from "react";
import {
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import { useAds, AD_UNIT_IDS } from "@/lib/ad-context";

/**
 * Hook to manage an interstitial ad lifecycle on native.
 * Preloads the ad and provides a `show()` function.
 * Respects the ad-free (premium) state.
 */
export function useInterstitialAd() {
  const { showAds } = useAds();
  const [isLoaded, setIsLoaded] = useState(false);
  const adRef = useRef<InterstitialAd | null>(null);
  const closedCallbackRef = useRef<(() => void) | null>(null);

  // Load the interstitial ad
  const loadAd = useCallback(() => {
    if (!showAds || !AD_UNIT_IDS.interstitial) return;

    try {
      const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        setIsLoaded(true);
      });

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        setIsLoaded(false);
        // Call the callback when ad is closed
        if (closedCallbackRef.current) {
          closedCallbackRef.current();
          closedCallbackRef.current = null;
        }
        // Preload the next ad
        loadAd();
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log("Interstitial ad error:", error);
        setIsLoaded(false);
        // If ad fails, still call the callback so the flow isn't blocked
        if (closedCallbackRef.current) {
          closedCallbackRef.current();
          closedCallbackRef.current = null;
        }
      });

      adRef.current = ad;
      ad.load();

      return () => {
        unsubLoaded();
        unsubClosed();
        unsubError();
      };
    } catch (e) {
      console.log("Failed to create interstitial ad:", e);
    }
  }, [showAds]);

  // Load ad on mount
  useEffect(() => {
    const cleanup = loadAd();
    return () => {
      cleanup?.();
      adRef.current = null;
    };
  }, [loadAd]);

  /**
   * Show the interstitial ad.
   * @param onClosed - Callback fired after the ad is closed (or if it fails to show).
   *                   This ensures the app flow continues regardless.
   */
  const show = useCallback(
    (onClosed?: () => void) => {
      if (!showAds) {
        // Premium user — skip ad, call callback immediately
        onClosed?.();
        return;
      }

      if (isLoaded && adRef.current) {
        closedCallbackRef.current = onClosed ?? null;
        adRef.current.show().catch(() => {
          // If show fails, call callback so flow isn't blocked
          onClosed?.();
        });
      } else {
        // Ad not loaded — skip and continue
        onClosed?.();
      }
    },
    [showAds, isLoaded]
  );

  return { show, isLoaded };
}
