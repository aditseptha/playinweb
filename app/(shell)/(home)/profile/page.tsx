import type { Metadata } from "next";
import { ProfileScreen } from "./screen";

export const metadata: Metadata = { title: "Your channel" };

export default function ProfilePage() {
  return <ProfileScreen />;
}
