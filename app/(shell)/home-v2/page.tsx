import { redirect } from "next/navigation";

/** The new homepage design now lives at "/"; keep old /home-v2 links working. */
export default function HomeV2Page() {
  redirect("/");
}
