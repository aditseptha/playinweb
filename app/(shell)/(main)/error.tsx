"use client";

import { ErrorState } from "@/components/RouteStates";
import s from "@/components/home/home.module.css";

export default function MainError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className={s.create}>
      <ErrorState {...props} />
    </div>
  );
}
