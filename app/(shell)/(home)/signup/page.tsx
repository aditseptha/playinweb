import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupAgreeNote } from "@/components/SignupAgreeNote";
import { SignupPagePrompt } from "@/components/SignupPagePrompt";
import s from "@/components/home/home.module.css";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className={s.create}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Account</p>
          <h1 className={s.createTitle}>Create an account</h1>
          <p className={s.legalIntro}>
            Your handle becomes a page on this site — localhost:4000/yourname.
          </p>
          <SignupAgreeNote className={s.legalIntro} />
          <div className={s.createForm}>
            <Suspense fallback={<p className={s.legalIntro}>Loading…</p>}>
              <SignupPagePrompt />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
