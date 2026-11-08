import type { Metadata } from "next";
import { LegalPage } from "@/components/home/LegalPage";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
