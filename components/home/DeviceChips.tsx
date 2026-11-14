"use client";

import { Chip } from "@/components/ds/badge";
import { DEVICE_LABEL, type Device } from "@/lib/device";

// Phone and Desktop chips in the filter sidebar's "Plays on" group (#38). One at a time; pressing the
// lit chip turns it off. On phones the Phone chip turns itself on (see HomeView), and the Filters
// button counts it, so people can see why some games are hidden and turn it off.
export function DeviceChips({ value, onChange }: { value: Device | null; onChange: (next: Device | null) => void }) {
  return (
    <div role="group" aria-label="Plays on" className="flex flex-wrap items-center gap-2">
      {(Object.keys(DEVICE_LABEL) as Device[]).map((device) => (
        <Chip key={device} size="sm" pressed={value === device} onClick={() => onChange(value === device ? null : device)}>
          {DEVICE_LABEL[device]}
          {value === device ? <span aria-hidden>×</span> : null}
        </Chip>
      ))}
    </div>
  );
}
