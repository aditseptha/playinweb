import type { Metadata } from "next";
import { ProjectForm } from "@/components/ProjectForm";
import s from "@/components/home/home.module.css";

export const metadata: Metadata = {
  title: "Add a game",
  description: "Publish an indie web game on PlayInWeb. Add a title, a playable build, and cover art.",
};

export default function RegisterPage() {
  return (
    <div className={`${s.create} ${s.pageSkin}`}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Publish</p>
          <h1 className={s.createTitle}>Add a game</h1>
          <div className={s.createForm}>
            <ProjectForm />
          </div>
        </div>
      </div>
    </div>
  );
}
