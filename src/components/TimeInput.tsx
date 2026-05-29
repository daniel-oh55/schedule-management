import { formatDuration, parseDurationToHours } from "../utils/time";

interface TimeInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export function TimeInput({ value, onChange, className = "", disabled }: TimeInputProps) {
  return (
    <input
      className={`grid-cell-input ${className}`}
      disabled={disabled}
      value={formatDuration(value)}
      onChange={(event) => onChange(parseDurationToHours(event.target.value))}
      onBlur={(event) => {
        event.currentTarget.value = formatDuration(parseDurationToHours(event.currentTarget.value));
      }}
    />
  );
}
