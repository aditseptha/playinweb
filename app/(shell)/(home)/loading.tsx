import { LoadingState } from "@/components/RouteStates";
import s from "@/components/home/home.module.css";

export default function HomeLoading() {
  return (
    <div className={s.create}>
      <LoadingState />
    </div>
  );
}
