"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";

let appInsightsInstance: ApplicationInsights | null = null;

const CONNECTION_STRING =
  process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING ||
  "InstrumentationKey=2af7adfc-33b0-4f74-a388-02e61d200c3e;IngestionEndpoint=https://swedencentral-0.in.applicationinsights.azure.com/;LiveEndpoint=https://swedencentral.livediagnostics.monitor.azure.com/";

export default function AzureAppInsights() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || initialized.current) return;
    if (!CONNECTION_STRING) return;

    try {
      const appInsights = new ApplicationInsights({
        config: {
          connectionString: CONNECTION_STRING,
          enableAutoRouteTracking: true,
          disableFetchTracking: false,
          enableCorsCorrelation: true,
          enableUnhandledPromiseRejectionTracking: true,
        },
      });

      appInsights.loadAppInsights();
      appInsights.trackPageView();
      appInsightsInstance = appInsights;
      initialized.current = true;
    } catch (e) {
      console.warn("[Azure AppInsights Web] Initialization error:", e);
    }
  }, []);

  // Track client-side page transitions in Next.js App Router
  useEffect(() => {
    if (appInsightsInstance && pathname) {
      appInsightsInstance.trackPageView({ uri: window.location.href });
    }
  }, [pathname]);

  return null;
}
