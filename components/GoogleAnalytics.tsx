"use client";

import Script from "next/script";
import { useEffect } from "react";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-66QLEXZFVF";
const consentKey = "telio-cookie-consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    const updateConsent = () => {
      const granted = localStorage.getItem(consentKey) === "accepted";

      window.gtag?.("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    };

    updateConsent();
    window.addEventListener("telio-cookie-consent-changed", updateConsent);
    window.addEventListener("storage", updateConsent);

    return () => {
      window.removeEventListener("telio-cookie-consent-changed", updateConsent);
      window.removeEventListener("storage", updateConsent);
    };
  }, []);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}
