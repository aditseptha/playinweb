import type { Metadata } from "next";
import { ManageScreen } from "./screen";

export const metadata: Metadata = { title: "Manage games" };

export default function ManagePage() {
  return <ManageScreen />;
}
