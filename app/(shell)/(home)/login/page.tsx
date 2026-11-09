import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPagePrompt } from "@/components/LoginPagePrompt";
import s from "@/components/home/home.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className={s.create}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Account</p>
          <h1 className={s.createTitle}>Sign in</h1>
          <p className={s.legalIntro}>Publish games on your page, like yourname/game.</p>
          <div className={s.createForm}>
            <Suspense fallback={<p className={s.legalIntro}>Loading…</p>}>
              <LoginPagePrompt />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
