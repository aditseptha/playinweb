import { LoadingState } from "@/components/RouteStates";
import s from "@/components/home/home.module.css";

export default function MainLoading() {
  return (
    <div className={s.create}>
      <LoadingState />
    </div>
  );
}
