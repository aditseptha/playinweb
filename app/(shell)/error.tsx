"use client";

import { ErrorState } from "@/components/RouteStates";
import { HomeShell } from "@/components/home/HomeShell";
import s from "@/components/home/home.module.css";

export default function ShellError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <HomeShell>
      <div className={s.create}>
        <ErrorState {...props} />
      </div>
    </HomeShell>
  );
}
