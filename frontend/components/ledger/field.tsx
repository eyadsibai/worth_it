"use client";

import { useId, useState, type ChangeEvent } from "react";

interface FieldProps {
  label: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  unit?: string;
  hint?: string;
  error?: string;
  min?: number;
  max?: number;
  /**
   * Advisory only: kept on the input as a hint for a future `type="number"`
   * variant. The blur parse does not round to `step` — silently rewriting a
   * typed 7.35 to 7.4 would surprise users.
   */
  step?: number;
  className?: string;
}

/** Clamps `value` into [min, max], leaving either bound open when omitted. */
function clampToRange(value: number, min: number | undefined, max: number | undefined): number {
  let clamped = value;
  if (min !== undefined && clamped < min) {
    clamped = min;
  }
  if (max !== undefined && clamped > max) {
    clamped = max;
  }
  return clamped;
}

/**
 * Number field on a hairline baseline. Holds the typed text locally and only
 * parses it into a number (or `null` when empty) on blur, so the caller never
 * sees a half-typed value. `error` is withheld until the field has been
 * touched, per spec §5's field states.
 */
export function Field({
  label,
  value,
  onValueChange,
  unit,
  hint,
  error,
  min,
  max,
  step,
  className,
}: FieldProps) {
  const errorId = useId();
  const hintId = useId();
  const [text, setText] = useState(value === null ? "" : String(value));
  const [touched, setTouched] = useState(false);
  // Adjust the local text during render (rather than in an effect) whenever
  // the caller pushes a new `value` — e.g. a form reset. React docs recommend
  // this over useEffect for "adjusting state when a prop changes": it avoids
  // an extra commit and the effect-cascade lint rule flags the alternative.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value === null ? "" : String(value));
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    const trimmed = text.trim();
    if (trimmed === "") {
      onValueChange(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      onValueChange(null);
      return;
    }
    const clamped = clampToRange(parsed, min, max);
    setText(String(clamped));
    onValueChange(clamped);
  };

  const showError = touched && Boolean(error);
  const showHint = Boolean(hint) && !showError;
  const describedBy = showError ? errorId : showHint ? hintId : undefined;

  return (
    <div className={className}>
      <label className="border-rule flex items-baseline justify-between gap-4 border-b py-2">
        <span className="text-annotation text-sm">{label}</span>
        <span className="flex items-baseline gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={handleChange}
            onBlur={handleBlur}
            min={min}
            max={max}
            step={step}
            aria-invalid={showError ? true : undefined}
            aria-describedby={describedBy}
            className="text-ink focus-visible:border-market w-28 bg-transparent text-end font-mono text-sm tabular-nums outline-none focus-visible:border-b"
          />
          {unit ? <span className="text-annotation text-xs">{unit}</span> : null}
        </span>
      </label>
      {showError ? (
        <p id={errorId} role="alert" className="text-loss py-1 text-xs">
          {error}
        </p>
      ) : null}
      {showHint ? (
        <p id={hintId} className="text-annotation py-1 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
