import type { CoastalRow, CoastalSchedule, LongTermSchedule } from "../types/schedule";
import type { DistanceRecord } from "../types/master";
import { getDistance, seaTimeHours } from "./distance";
import { createId } from "./id";
import { diffHours } from "./time";

export function createCoastalFromLongTerm(longTerm: LongTermSchedule, voyage: string): CoastalSchedule {
  const sourceRows = longTerm.rows.filter((row) => row.voyage === voyage);

  return {
    id: createId("coastal"),
    longTermScheduleId: longTerm.id,
    serviceCode: longTerm.serviceCode,
    vesselCode: longTerm.vesselCode,
    voyage,
    updatedAtIso: new Date().toISOString(),
    rows: sourceRows.map<CoastalRow>((row) => ({
      id: createId("crow"),
      longTermRowId: row.id,
      seq: row.seq,
      serviceCode: longTerm.serviceCode,
      vesselCode: longTerm.vesselCode,
      voyage: row.voyage,
      fromPort: row.fromPort,
      wharf: row.wharf,
      toPort: row.toPort,
      bound: row.bound,
      longTermEtaIso: row.etaIso,
      coastalEtaIso: row.etaIso,
      longTermEtdIso: row.etdIso,
      coastalEtdIso: row.etdIso,
      delayHours: 0,
      distanceNm: row.distanceNm,
      speed: row.speed,
      seaTimeHours: row.seaTimeHours,
      bufferHours: row.bufferHours,
      remark: row.remark,
    })),
  };
}

export function recalculateCoastalRows(rows: CoastalRow[], distances: DistanceRecord[]): CoastalRow[] {
  return rows.map((row, index) => {
    const distanceNm = getDistance(distances, row.fromPort, row.toPort);
    return {
      ...row,
      seq: index + 1,
      distanceNm,
      seaTimeHours: seaTimeHours(distanceNm, row.speed),
      delayHours: diffHours(row.coastalEtaIso, row.longTermEtaIso),
    };
  });
}
