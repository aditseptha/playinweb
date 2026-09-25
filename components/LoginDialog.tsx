"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  closeSignupModalNow,
  registerLoginModalCloser,
} from "@/lib/auth-modal-bridge";
import { AuthModalShell } from "@/components/AuthModal";
import { LoginForm, LoginFormFooter } from "@/components/LoginForm";
import { useSignupDialog } from "@/components/SignupDialog";

type LoginOptions = {
  next?: string;
  title?: string;
  description?: string;
};

const LoginContext = createContext<{
  openLogin: (options?: LoginOptions) => void;
  closeLogin: () => void;
}>({
  openLogin: () => {},
  closeLogin: () => {},
});

export function useLoginDialog() {
  return useContext(LoginContext);
}

export function loginReturnUrl(next?: string) {
  if (next) return next;
  if (typeof window === "undefined") return undefined;
  return window.location.href;
}

export function LoginProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<LoginOptions>({});

  const openLogin = useCallback((opts?: LoginOptions) => {
    closeSignupModalNow();
    setOptions(opts ?? {});
    setOpen(true);
  }, []);
  const closeLogin = useCallback(() => setOpen(false), []);

  useEffect(() => {
    registerLoginModalCloser(closeLogin);
  }, [closeLogin]);

  return (
    <LoginContext.Provider value={{ openLogin, closeLogin }}>
      {children}
      <LoginDialog
        open={open}
        onClose={() => setOpen(false)}
        next={options.next ?? loginReturnUrl()}
        title={options.title}
        description={options.description}
      />
    </LoginContext.Provider>
  );
}

export function LoginDialog({
  open,
  onClose,
  next,
  title = "Welcome back",
  description,
}: {
  open: boolean;
  onClose: () => void;
  next?: string;
  title?: string;
  description?: string;
}) {
  const { openSignup, closeSignup } = useSignupDialog();
  const { closeLogin } = useLoginDialog();
  const [formMode, setFormMode] = useState<"sign-in" | "forgot">("sign-in");
  const dialogTitle = formMode === "forgot" ? "Reset password" : title;

  useEffect(() => {
    if (!open) setFormMode("sign-in");
  }, [open]);

  return (
    <AuthModalShell
      open={open}
      onClose={onClose}
      title={dialogTitle}
      description={formMode === "sign-in" ? description : undefined}
      footer={
        formMode === "sign-in"
          ? (
              <LoginFormFooter
                onCreateAccount={() => {
                  closeLogin();
                  closeSignup();
                  openSignup();
                }}
              />
            )
          : undefined
      }
    >
      <LoginForm next={next} onSuccess={onClose} onModeChange={setFormMode} />
    </AuthModalShell>
  );
}
