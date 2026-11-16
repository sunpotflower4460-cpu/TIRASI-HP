import { useId } from "react";
import type { CreativeDocument } from "../../studio/document";
export type DocumentMutator = (
  id: string,
  fn: (doc: CreativeDocument) => CreativeDocument,
  remember?: boolean,
) => void;
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  max = 1000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  max?: number;
}) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          aria-label={label}
          value={value}
          rows={3}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const controlId = useId();
  return (
    <label className="studio-range" htmlFor={controlId}>
      <span>
        {label}
        <output aria-hidden="true">{Number(value.toFixed(2))}</output>
      </span>
      <input
        id={controlId}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
