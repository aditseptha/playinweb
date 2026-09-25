"use client";

import Link from "next/link";
import { useLegalModal } from "@/components/LegalModal";

export function SignupAgreeNote({
  className,
  popup = false,
}: {
  className?: string;
  popup?: boolean;
}) {
  const { openLegal } = useLegalModal();
  const linkClass = "text-text hover:underline";

  if (popup) {
    return (
      <p className={className ?? "text-caption text-text-subtle"}>
        By registering, you agree to our{" "}
        <button type="button" className={linkClass} onClick={() => openLegal("terms")}>
          Terms
        </button>{" "}
        and{" "}
        <button type="button" className={linkClass} onClick={() => openLegal("privacy")}>
          Privacy Policy
        </button>
        .
      </p>
    );
  }

  return (
    <p className={className ?? "text-caption text-text-subtle"}>
      By registering, you agree to our{" "}
      <Link href="/terms" className={linkClass}>
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className={linkClass}>
        Privacy Policy
      </Link>
      .
    </p>
  );
}
