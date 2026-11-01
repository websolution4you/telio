import type { Metadata } from "next";
import ClientDemoDashboard from "@/components/demo/ClientDemoDashboard";

export const metadata: Metadata = {
  title: "Telio • Ukážkový Klientsky Dashboard",
  description: "Prehľad hlasového paušálu a vybraných ElevenLabs hovorov AI asistenta.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardDemoPage() {
  return <ClientDemoDashboard />;
}

