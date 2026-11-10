import type { Metadata } from "next";
import { EditGameScreen } from "./screen";

export const metadata: Metadata = { title: "Edit game" };

export default function EditGamePage() {
  return <EditGameScreen />;
}
