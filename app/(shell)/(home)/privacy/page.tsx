import type { Metadata } from "next";
import { LegalPage } from "@/components/home/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "PlayInWeb Privacy Policy — how we collect, use, share, and protect your personal information when you browse, play, sign in, publish, or tip on playinweb.com.",
};

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
