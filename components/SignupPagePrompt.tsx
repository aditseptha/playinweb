"use client";

import { useEffect } from "react";
import { useSignupDialog } from "@/components/SignupDialog";
import { Button } from "@/components/ui/button";

export function SignupPagePrompt() {
  const { openSignup } = useSignupDialog();

  useEffect(() => {
    openSignup();
  }, [openSignup]);

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => openSignup()}>
      Open create account
    </Button>
  );
}
