"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";

export function LoginPagePrompt() {
  const { openLogin } = useLoginDialog();
  const params = useSearchParams();
  const next = params.get("next");

  useEffect(() => {
    openLogin({ next: next ?? undefined });
  }, [next, openLogin]);

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => openLogin({ next: next ?? undefined })}>
      Open sign in
    </Button>
  );
}
