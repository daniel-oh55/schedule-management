import { formatDuration } from "../utils/time";

interface StatusStripProps {
  distanceNm: number;
  maneuverHours: number;
  terminalHours: number;
  seaHours: number;
  bufferHours: number;
  totalHours: number;
}

export function StatusStrip({
  distanceNm,
  maneuverHours,
  terminalHours,
  seaHours,
  bufferHours,
  totalHours,
}: StatusStripProps) {
  const items = [
    ["Distance", `${Math.round(distanceNm).toLocaleString()} NM`],
    ["Maneuvering", formatDuration(maneuverHours)],
    ["Terminal", formatDuration(terminalHours)],
    ["Sea", formatDuration(seaHours)],
    ["Buffer", formatDuration(bufferHours)],
    ["Total", formatDuration(totalHours)],
  ];

  return (
    <div className="grid grid-cols-6 gap-2 border border-slate-300 bg-white p-2">
      {items.map(([label, value]) => (
        <div key={label} className="border border-slate-200 bg-slate-50 px-2 py-1">
          <div className="field-label">{label}</div>
          <div className="text-sm font-semibold text-slate-900">{value}</div>
        </div>
      ))}
    </div>
  );
}
