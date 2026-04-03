import React from "react";

interface AdBannerProps {
  style?: any;
}

/**
 * Web version of AdBanner — ads are not supported on web, so render nothing.
 */
export function AdBanner(_props: AdBannerProps) {
  return null;
}
