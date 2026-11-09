import { DetailSkeleton } from "@/components/ds/skeleton";
import { HomeShell } from "@/components/home/HomeShell";
import { NavBackdrop } from "@/components/home/NavBackdrop";

export default function GameLoading() {
  return (
    <HomeShell>
      <div className="relative">
        <NavBackdrop />
        <div className="mx-auto w-full max-w-[1232px] px-4 pt-[84px] pb-16 md:px-6 md:pt-[100px]">
          <DetailSkeleton />
        </div>
      </div>
    </HomeShell>
  );
}
