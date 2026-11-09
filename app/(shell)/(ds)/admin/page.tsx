import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeShell } from "@/components/home/HomeShell";
import { AdminScreen } from "./screen";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <HomeShell>
        <AdminScreen />
      </HomeShell>
    </Suspense>
  );
}
