import type { Metadata } from "next";
import { CollectionScreen } from "./screen";

export const metadata: Metadata = { title: "Collection" };

export default function CollectionPage() {
  return <CollectionScreen />;
}
