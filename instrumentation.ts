export async function register() {
  // Only initialize telemetry in the Node.js server runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

    // If connection string is missing, silently skip without crashing
    if (!connectionString) {
      return;
    }

    try {
      const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");

      useAzureMonitor({
        azureMonitorExporterOptions: {
          connectionString,
        },
        enableLiveMetrics: true,
        enableStandardMetrics: true,
        // Disable console instrumentation to avoid leaking logs with sensitive PII or credentials
        instrumentationOptions: {
          console: { enabled: false },
        },
      });
    } catch (err) {
      // Fail-safe: telemetry initialization failure must never crash or block Telio
      console.warn("[Azure AppInsights] Telemetry initialization skipped or failed:", err);
    }
  }
}

export async function onRequestError(err: unknown) {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs" && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      const { trace, SpanStatusCode } = await import("@opentelemetry/api");
      const activeSpan = trace.getActiveSpan();
      if (activeSpan && err instanceof Error) {
        activeSpan.recordException(err);
        activeSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: err.message,
        });
      }
    }
  } catch {
    // Fail-safe: telemetry error tracking must never throw
  }
}
