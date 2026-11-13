"use client";

import { Chip } from "@/components/ds/badge";
import { DEVICE_LABEL, type Device } from "@/lib/device";

// Phone and Desktop chips above the catalogue (#38). One at a time; pressing the lit chip turns it
// off. On phones the Phone chip turns itself on (see HomeView); it always stays visible so people
// can see why some games are hidden and turn it off.
export function DeviceChips({ value, onChange }: { value: Device | null; onChange: (next: Device | null) => void }) {
  return (
    <div role="group" aria-label="Plays on" className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-pw-caption font-semibold text-pw-muted">Plays on</span>
      {(Object.keys(DEVICE_LABEL) as Device[]).map((device) => (
        <Chip key={device} size="sm" pressed={value === device} onClick={() => onChange(value === device ? null : device)}>
          {DEVICE_LABEL[device]}
          {value === device ? <span aria-hidden>×</span> : null}
        </Chip>
      ))}
    </div>
  );
}
