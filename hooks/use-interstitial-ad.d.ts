export function useInterstitialAd(): {
  show: (onClosed?: () => void) => void;
  isLoaded: boolean;
};
