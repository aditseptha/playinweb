import Link from "next/link";
import { Button } from "@/components/ds/button";
import { StatusPage } from "@/components/ds/empty-state";
import { HomeShell } from "@/components/home/HomeShell";
import s from "@/components/home/home.module.css";

export function NotFoundPage() {
  return (
    <HomeShell>
      <div className={s.create}>
        <StatusPage
          status="not-found"
          fullHeight={false}
          actions={
            <Button variant="primary" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          }
        />
      </div>
    </HomeShell>
  );
}
