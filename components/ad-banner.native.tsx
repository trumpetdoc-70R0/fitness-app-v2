import React from "react";
import { View, StyleSheet } from "react-native";
import { useAds, AD_UNIT_IDS } from "@/lib/ad-context";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

interface AdBannerProps {
  style?: any;
}

export function AdBanner({ style }: AdBannerProps) {
  const { showAds } = useAds();

  if (!showAds || !AD_UNIT_IDS.banner) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          console.log("Banner ad failed to load:", error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
});
