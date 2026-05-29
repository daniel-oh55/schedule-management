import type { LongTermRow, LongTermSchedule, ProformaSchedule } from "../types/schedule";
import { addCycle, shiftProformaIso } from "./time";
import { createId } from "./id";

function numericVoyages(from: string, to: string): string[] {
  const start = Number(from);
  const end = Number(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [from].filter(Boolean);
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

export function generateLongTermSchedule(
  proforma: ProformaSchedule,
  vesselCode: string,
  vesselName: string,
  voyageFrom: string,
  voyageTo: string,
  firstEtaIso: string,
): LongTermSchedule {
  const voyages = numericVoyages(voyageFrom, voyageTo);
  const rows: LongTermRow[] = voyages.flatMap((voyage, voyageIndex) => {
    const voyageStartIso = addCycle(firstEtaIso, proforma.header.cycleDays || proforma.header.cycleWeeks * 7 || 7, voyageIndex);

    return proforma.rows.map((row) => ({
      id: createId("ltrow"),
      proformaRowId: row.id,
      seq: row.seq,
      voyage,
      fromPort: row.fromPort,
      wharf: row.wharf,
      toPort: row.toPort,
      bound: row.bound,
      etaIso: shiftProformaIso(proforma.header.baseStartIso, row.etaIso, voyageStartIso),
      etbIso: shiftProformaIso(proforma.header.baseStartIso, row.etbIso, voyageStartIso),
      etdIso: shiftProformaIso(proforma.header.baseStartIso, row.etdIso, voyageStartIso),
      distanceNm: row.distanceNm,
      speed: row.speed,
      seaTimeHours: row.seaTimeHours,
      bufferHours: row.bufferHours,
      totalTimeHours: row.totalTimeHours,
      groupNo: row.groupNo,
      remark: row.remark,
    }));
  });

  return {
    id: createId("longterm"),
    serviceCode: proforma.header.serviceCode,
    vesselCode,
    vesselName,
    voyageFrom,
    voyageTo,
    firstEtaIso,
    rows,
    updatedAtIso: new Date().toISOString(),
  };
}
