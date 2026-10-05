"use client";

import { ErrorState } from "@/components/RouteStates";

export default function MainError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorState {...props} />;
}
