"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-66QLEXZFVF";
const consentKey = "telio-cookie-consent";

export default function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const updateConsent = () => {
      setHasConsent(localStorage.getItem(consentKey) === "accepted");
    };

    updateConsent();
    window.addEventListener("telio-cookie-consent-changed", updateConsent);
    window.addEventListener("storage", updateConsent);

    return () => {
      window.removeEventListener("telio-cookie-consent-changed", updateConsent);
      window.removeEventListener("storage", updateConsent);
    };
  }, []);

  if (!measurementId || !hasConsent) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
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
