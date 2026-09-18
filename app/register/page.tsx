import type { Metadata } from "next";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata: Metadata = {
  title: "Create a new game",
};

export default function RegisterPage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl">
        <h1 className="text-display font-semibold tracking-tight">Create a new game</h1>
        <p className="mt-1.5 max-w-2xl text-body leading-relaxed text-text-muted">
          Fill in the listing — title, game URL, classification, and an HTML zip to play in the page.
        </p>
      </div>
      <div className="mt-8">
        <ProjectForm />
      </div>
    </div>
  );
}
