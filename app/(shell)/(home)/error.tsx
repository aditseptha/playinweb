"use client";

import { ErrorState } from "@/components/RouteStates";

export default function HomeError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="pt-[96px]">
      <ErrorState {...props} />
    </div>
  );
}
