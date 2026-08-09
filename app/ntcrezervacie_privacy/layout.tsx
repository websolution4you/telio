import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zásady ochrany osobných údajov – NTC Rezervácie | Telio",
  description: "Zásady ochrany osobných údajov a podmienky spracúvania údajov pre mobilnú aplikáciu NTC Rezervácie spoločnosti Telio s. r. o. v súlade s GDPR.",
  alternates: { canonical: "/ntcrezervacie_privacy" },
  openGraph: {
    title: "Zásady ochrany osobných údajov – NTC Rezervácie | Telio",
    description: "Zásady ochrany osobných údajov pre mobilnú aplikáciu NTC Rezervácie v súlade s GDPR.",
    url: "/ntcrezervacie_privacy",
  },
};

export default function NtcPrivacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
