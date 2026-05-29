import { KeyboardEvent, useEffect, useState } from "react";

interface NumberCellInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  step?: string;
}

export function NumberCellInput({ value, onChange, className = "", step = "0.1" }: NumberCellInputProps) {
  const [draft, setDraft] = useState(String(value || ""));

  useEffect(() => {
    setDraft(String(value || ""));
  }, [value]);

  function commit() {
    const numeric = Number(draft);
    if (Number.isFinite(numeric)) {
      onChange(numeric);
      setDraft(String(numeric));
    } else {
      setDraft(String(value || ""));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }

  return (
    <input
      className={`grid-cell-input ${className}`}
      inputMode="decimal"
      step={step}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
