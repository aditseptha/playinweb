import { MosaicGrid } from "@/components/ui/mosaic-grid";

export function SidebarFooterGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-2xl text-brand-blue"
      aria-hidden
    >
      <MosaicGrid />
    </div>
  );
}
