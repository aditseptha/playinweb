"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { Checkbox as RCheckbox, RadioGroup as RRadioGroup, Switch as RSwitch } from "radix-ui";
import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { focusRing, hitArea } from "./styles";

// Field wires a label, hint, error and counter to the control inside it, so every control
// gets the right id, aria-describedby and aria-invalid without passing them by hand.

type FieldIds = { id: string; describedBy?: string; invalid: boolean; required: boolean };
const FieldContext = createContext<FieldIds | null>(null);

function useField() {
  return useContext(FieldContext);
}

export function Field({
  label,
  hint,
  error,
  optional = false,
  counter,
  id: idProp,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  /** Shown under the control in danger colour. Show it only after the user has touched the field. */
  error?: ReactNode;
  /** Marks the field "(optional)". Required fields carry no marker. */
  optional?: boolean;
  counter?: { value: number; max: number };
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const auto = useId();
  const id = idProp ?? `f${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const over = counter ? counter.value > counter.max : false;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required: !optional }}>
      <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-pw-body-sm font-semibold text-pw-text">
            {label}
            {optional ? <span className="ml-1 font-normal text-pw-muted">(optional)</span> : null}
          </label>
          {counter ? (
            <span
              className={cn("text-pw-caption tabular-nums", over ? "text-pw-danger" : "text-pw-muted")}
              aria-live="polite"
            >
              {counter.value}/{counter.max}
            </span>
          ) : null}
        </div>
        {children}
        {error ? (
          <p id={errorId} className="text-pw-caption font-medium text-pw-danger">
            {error}
          </p>
        ) : null}
        {hint ? (
          <p id={hintId} className="text-pw-caption text-pw-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

const control = cn(
  "w-full min-w-0 rounded-pw-md border border-pw-line-box bg-pw-surface-1 px-3.5 text-pw-body text-pw-text",
  "placeholder:text-pw-faint transition-colors duration-150",
  "hover:border-pw-line-strong focus-visible:border-pw-focus-ring",
  "aria-invalid:border-pw-danger disabled:cursor-not-allowed disabled:opacity-50",
  focusRing,
);

function fieldProps(field: FieldIds | null, props: { id?: string; "aria-describedby"?: string }) {
  if (!field) return {};
  return {
    id: props.id ?? field.id,
    "aria-describedby": props["aria-describedby"] ?? field.describedBy,
    "aria-invalid": field.invalid || undefined,
  };
}

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  const field = useField();
  return <input className={cn(control, "h-11", className)} {...fieldProps(field, props)} {...props} />;
}

export function TextArea({ className, rows = 4, ...props }: React.ComponentProps<"textarea">) {
  const field = useField();
  return (
    <textarea
      rows={rows}
      className={cn(control, "min-h-24 resize-y py-2.5", className)}
      {...fieldProps(field, props)}
      {...props}
    />
  );
}

/** Native select: accessible and comfortable on phones. */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  const field = useField();
  return (
    <span className="relative block">
      <select className={cn(control, "h-11 appearance-none pr-10", className)} {...fieldProps(field, props)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-pw-muted"
      />
    </span>
  );
}

export function SearchInput({
  className,
  value,
  onValueChange,
  label = "Search",
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "type"> & {
  value: string;
  onValueChange: (v: string) => void;
  /** Accessible name when there is no visible label. */
  label?: string;
}) {
  return (
    <span className={cn("relative block", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-pw-muted"
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(control, "h-11 rounded-pw-pill pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden")}
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className={cn(
            "absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-pw-muted hover:bg-pw-surface-3 hover:text-pw-text",
            focusRing,
            hitArea,
          )}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </span>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof RCheckbox.Root> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <RCheckbox.Root
        id={id}
        aria-describedby={description ? `${id}-d` : undefined}
        className={cn(
          "relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border border-pw-line-box bg-pw-surface-1",
          "data-[state=checked]:border-pw-primary data-[state=checked]:bg-pw-primary data-[state=checked]:text-pw-on-primary",
          "disabled:opacity-50",
          focusRing,
          "before:absolute before:-inset-3 before:content-['']",
        )}
        {...props}
      >
        <RCheckbox.Indicator>
          <Check className="size-3.5" strokeWidth={3} />
        </RCheckbox.Indicator>
      </RCheckbox.Root>
      <div className="min-w-0">
        <label htmlFor={id} className="text-pw-body text-pw-text">
          {label}
        </label>
        {description ? (
          <p id={`${id}-d`} className="text-pw-caption text-pw-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RadioGroup({
  options,
  className,
  ...props
}: React.ComponentProps<typeof RRadioGroup.Root> & {
  options: Array<{ value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }>;
}) {
  const id = useId();
  return (
    <RRadioGroup.Root className={cn("flex flex-col gap-3", className)} {...props}>
      {options.map((o) => (
        <div key={o.value} className="flex items-start gap-3">
          <RRadioGroup.Item
            id={`${id}-${o.value}`}
            value={o.value}
            disabled={o.disabled}
            className={cn(
              "relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-pw-line-box bg-pw-surface-1",
              "data-[state=checked]:border-pw-primary disabled:opacity-50",
              focusRing,
              "before:absolute before:-inset-3 before:content-['']",
            )}
          >
            <RRadioGroup.Indicator className="size-2.5 rounded-full bg-pw-primary" />
          </RRadioGroup.Item>
          <div className="min-w-0">
            <label htmlFor={`${id}-${o.value}`} className="text-pw-body text-pw-text">
              {o.label}
            </label>
            {o.description ? <p className="text-pw-caption text-pw-muted">{o.description}</p> : null}
          </div>
        </div>
      ))}
    </RRadioGroup.Root>
  );
}

export function Switch({
  label,
  className,
  ...props
}: React.ComponentProps<typeof RSwitch.Root> & { label: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="text-pw-body text-pw-text">
        {label}
      </label>
      <RSwitch.Root
        id={id}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full bg-pw-surface-3 transition-colors duration-150",
          "data-[state=checked]:bg-pw-primary disabled:opacity-50",
          focusRing,
          "before:absolute before:-inset-2 before:content-['']",
        )}
        {...props}
      >
        <RSwitch.Thumb className="block size-6 translate-x-0.5 rounded-full bg-pw-white shadow-pw-1 transition-transform duration-150 ease-pw-out data-[state=checked]:translate-x-[22px]" />
      </RSwitch.Root>
    </div>
  );
}

/**
 * Top-of-form list of errors for long forms. Each item links to its field.
 * Render it after a failed submit and move focus to it (or to the first invalid field).
 */
export function FormErrorSummary({
  errors,
  className,
  ref,
}: {
  errors: Array<{ fieldId: string; message: string }>;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  if (errors.length === 0) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className={cn(
        "rounded-pw-lg border border-pw-danger/40 bg-pw-danger/10 p-4 text-pw-body-sm text-pw-text",
        focusRing,
        className,
      )}
    >
      <p className="font-semibold">
        {errors.length === 1 ? "1 thing needs fixing" : `${errors.length} things need fixing`}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((e) => (
          <li key={e.fieldId}>
            <a
              href={`#${e.fieldId}`}
              className="text-pw-danger underline underline-offset-2"
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(e.fieldId)?.focus();
              }}
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
