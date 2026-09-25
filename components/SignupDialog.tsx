"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  closeLoginModalNow,
  registerSignupModalCloser,
} from "@/lib/auth-modal-bridge";
import { AuthModalShell } from "@/components/AuthModal";
import { LoginProvider, useLoginDialog } from "@/components/LoginDialog";
import { SignupForm, SignupFormFooter } from "@/components/SignupForm";

type SignupOptions = {
  title?: string;
  description?: string;
};

const SignupContext = createContext<{
  openSignup: (options?: SignupOptions) => void;
  closeSignup: () => void;
}>({
  openSignup: () => {},
  closeSignup: () => {},
});

export function useSignupDialog() {
  return useContext(SignupContext);
}

export function SignupProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SignupOptions>({});

  const openSignup = useCallback((opts?: SignupOptions) => {
    closeLoginModalNow();
    setOptions(opts ?? {});
    setOpen(true);
  }, []);
  const closeSignup = useCallback(() => setOpen(false), []);

  useEffect(() => {
    registerSignupModalCloser(closeSignup);
  }, [closeSignup]);

  return (
    <SignupContext.Provider value={{ openSignup, closeSignup }}>
      <LoginProvider>
        {children}
        <SignupDialog
          open={open}
          onClose={() => setOpen(false)}
          title={options.title}
        />
      </LoginProvider>
    </SignupContext.Provider>
  );
}

function SignupDialogBody({
  open,
  onClose,
  title = "Create account",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  const { openLogin, closeLogin } = useLoginDialog();
  const { closeSignup } = useSignupDialog();

  return (
    <AuthModalShell
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <SignupFormFooter
          onSignIn={() => {
            closeSignup();
            closeLogin();
            openLogin();
          }}
        />
      }
    >
      <SignupForm onSuccess={onClose} />
    </AuthModalShell>
  );
}

export function SignupDialog({
  open,
  onClose,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  return <SignupDialogBody open={open} onClose={onClose} title={title} />;
}
