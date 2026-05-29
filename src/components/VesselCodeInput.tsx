import type { VesselMaster } from "../types/master";

interface VesselCodeInputProps {
  id: string;
  value: string;
  vessels: VesselMaster[];
  onChange: (vesselCode: string) => void;
  className?: string;
}

export function VesselCodeInput({ id, value, vessels, onChange, className = "field-input" }: VesselCodeInputProps) {
  return (
    <>
      <input
        className={className}
        list={`${id}-list`}
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <datalist id={`${id}-list`}>
        {vessels.map((vessel) => (
          <option key={vessel.id} value={vessel.vesselCode}>
            {vessel.vesselName}
          </option>
        ))}
      </datalist>
    </>
  );
}
