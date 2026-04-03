/**
 * Web stub for interstitial ads.
 * AdMob is not supported on web, so this is a no-op.
 */
export function useInterstitialAd() {
  return {
    show: (onClosed?: () => void) => {
      // No ads on web — immediately call the callback
      onClosed?.();
    },
    isLoaded: false,
  };
}
