export type AnalyticsEvent =
  | "generate_lead"
  | "select_pricing_plan"
  | "click_demo_cta"
  | "start_demo_call"
  | "play_audio_demo"
  | "click_contact"
  | "click_social_link";

type EventParameters = Record<string, string | number | boolean>;

const consentKey = "telio-cookie-consent";

export function trackEvent(eventName: AnalyticsEvent, parameters: EventParameters = {}) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(consentKey) !== "accepted") return;

  window.gtag?.("event", eventName, parameters);
}
