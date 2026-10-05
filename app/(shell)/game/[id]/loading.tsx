import { LoadingState } from "@/components/RouteStates";
import { WithAppShell } from "@/components/WithAppShell";

export default function GameLoading() {
  return (
    <WithAppShell>
      <LoadingState />
    </WithAppShell>
  );
}
