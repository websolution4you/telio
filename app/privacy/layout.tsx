import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov",
  description: "Informácie o ochrane osobných údajov a používaní cookies na webovej stránke Telio.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Ochrana osobných údajov | Telio",
    description: "Informácie o ochrane osobných údajov a používaní cookies na webovej stránke Telio.",
    url: "/privacy",
  },
};

export default function PrivacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
