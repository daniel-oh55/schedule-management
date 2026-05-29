import type { DistanceRecord, PortMaster } from "../types/master";
import type { BoundCode, ProformaHeader, ProformaRow, ProformaSchedule } from "../types/schedule";
import { getDistance, seaTimeHours } from "./distance";
import { createId } from "./id";
import { addHoursToIso, BASE_PROFORMA_START_ISO, roundUpBufferToNextHourHours } from "./time";

export function parsePortRotation(rotation: string): string[] {
  return rotation
    .split(/>|,|\n|\t/)
    .map((port) => port.trim().toUpperCase())
    .filter(Boolean);
}

function getPortMaster(ports: PortMaster[], code: string): PortMaster | undefined {
  return ports.find((port) => port.portCode.toUpperCase() === code.toUpperCase());
}

function rowKey(fromPort: string, toPort: string): string {
  return `${fromPort.toUpperCase()}__${toPort.toUpperCase()}`;
}

function updateRowMetrics(row: ProformaRow, header: ProformaHeader, distances: DistanceRecord[], seq: number): ProformaRow {
  const distanceNm = row.manualFields.includes("distanceNm")
    ? row.distanceNm
    : getDistance(distances, row.fromPort, row.toPort) ?? row.distanceNm;
  const speed = row.speed || header.defaultSpeed || 0;
  const sea = seaTimeHours(distanceNm, speed) ?? row.seaTimeHours;

  return {
    ...row,
    seq,
    distanceNm,
    speed,
    seaTimeHours: sea,
    totalTimeHours:
      sea === null
        ? null
        : (row.arrivalManvHours || 0) +
          (row.terminalHours || 0) +
          (row.departureManvHours || 0) +
          sea +
          (row.bufferHours || 0),
  };
}

function recalculateFromIndex(
  header: ProformaHeader,
  rows: ProformaRow[],
  distances: DistanceRecord[],
  startIndex: number,
): ProformaRow[] {
  if (!rows.length) return rows;

  let previousEtdIso = rows[Math.max(0, startIndex - 1)]?.etdIso;
  let previousDepartureManv = rows[Math.max(0, startIndex - 1)]?.departureManvHours ?? 0;
  let previousSea = rows[Math.max(0, startIndex - 1)]?.seaTimeHours ?? 0;
  let previousBuffer = rows[Math.max(0, startIndex - 1)]?.bufferHours ?? 0;

  return rows.map((row, index) => {
    const rowWithEta =
      index < startIndex
        ? row
        : {
            ...row,
            etaIso:
              index === 0
                ? row.etaIso || header.baseStartIso || BASE_PROFORMA_START_ISO
                : addHoursToIso(previousEtdIso, previousDepartureManv + previousSea + previousBuffer),
          };

    if (index < startIndex) {
      return updateRowMetrics(rowWithEta, header, distances, index + 1);
    }

    const distanceNm = rowWithEta.manualFields.includes("distanceNm")
      ? rowWithEta.distanceNm
      : getDistance(distances, rowWithEta.fromPort, rowWithEta.toPort) ?? rowWithEta.distanceNm;
    const speed = rowWithEta.speed || header.defaultSpeed || 0;
    const sea = seaTimeHours(distanceNm, speed) ?? rowWithEta.seaTimeHours;
    const etbIso = addHoursToIso(rowWithEta.etaIso, rowWithEta.arrivalManvHours || 0);
    const etdIso = addHoursToIso(etbIso, rowWithEta.terminalHours || 0);
    const recalculated = {
      ...rowWithEta,
      seq: index + 1,
      distanceNm,
      speed,
      seaTimeHours: sea,
      etbIso,
      etdIso,
      totalTimeHours:
        sea === null
          ? null
          : (rowWithEta.arrivalManvHours || 0) +
            (rowWithEta.terminalHours || 0) +
            (rowWithEta.departureManvHours || 0) +
            sea +
            (rowWithEta.bufferHours || 0),
    };

    previousEtdIso = recalculated.etdIso;
    previousDepartureManv = recalculated.departureManvHours || 0;
    previousSea = recalculated.seaTimeHours || 0;
    previousBuffer = recalculated.bufferHours || 0;

    return recalculated;
  });
}

function recalculateSingleRowTimes(row: ProformaRow): ProformaRow {
  const etbIso = addHoursToIso(row.etaIso, row.arrivalManvHours || 0);
  const etdIso = addHoursToIso(etbIso, row.terminalHours || 0);
  return { ...row, etbIso, etdIso };
}

export function buildProformaRows(
  header: ProformaHeader,
  ports: PortMaster[],
  distances: DistanceRecord[],
): ProformaRow[] {
  const rotation = parsePortRotation(header.portRotationText);
  const rows: ProformaRow[] = [];
  let currentEtaIso = header.baseStartIso || BASE_PROFORMA_START_ISO;

  for (let index = 0; index < rotation.length - 1; index += 1) {
    const fromPort = rotation[index];
    const toPort = rotation[index + 1];
    const master = getPortMaster(ports, fromPort);
    const distanceNm = getDistance(distances, fromPort, toPort);
    const speed = header.defaultSpeed || 0;
    const sea = seaTimeHours(distanceNm, speed);
    const arrivalManvHours = master?.defaultArrivalManvHours ?? 1;
    const terminalHours = master?.defaultTerminalHours ?? 18;
    const departureManvHours = master?.defaultDepartureManvHours ?? 1;
    const etbIso = addHoursToIso(currentEtaIso, arrivalManvHours);
    const etdIso = addHoursToIso(etbIso, terminalHours);
    const rawNextEtaIso = sea === null ? addHoursToIso(etdIso, departureManvHours) : addHoursToIso(etdIso, departureManvHours + sea);
    const bufferHours = index < rotation.length - 2 ? roundUpBufferToNextHourHours(rawNextEtaIso) : 0;
    const totalTimeHours = sea === null ? null : arrivalManvHours + terminalHours + departureManvHours + sea + bufferHours;

    rows.push({
      id: createId("pfrow"),
      seq: index + 1,
      fromPort,
      wharf: master?.defaultWharf ?? "",
      toPort,
      bound: "" as BoundCode,
      etaIso: currentEtaIso,
      etbIso,
      etdIso,
      arrivalManvHours,
      terminalHours,
      departureManvHours,
      distanceNm,
      speed,
      seaTimeHours: sea,
      bufferHours,
      totalTimeHours,
      groupNo: "G1",
      remark: "",
      manualFields: [],
    });

    currentEtaIso = addHoursToIso(rawNextEtaIso, bufferHours);
  }

  return rows;
}

export function recalculateProformaRows(
  header: ProformaHeader,
  rows: ProformaRow[],
  distances: DistanceRecord[],
): ProformaRow[] {
  let currentEtaIso = header.baseStartIso || rows[0]?.etaIso || BASE_PROFORMA_START_ISO;

  return rows.map((row, index) => {
    const distanceNm = getDistance(distances, row.fromPort, row.toPort) ?? row.distanceNm;
    const speed = row.speed || header.defaultSpeed || 0;
    const sea = seaTimeHours(distanceNm, speed) ?? row.seaTimeHours;
    const etbIso = addHoursToIso(currentEtaIso, row.arrivalManvHours || 0);
    const etdIso = addHoursToIso(etbIso, row.terminalHours || 0);
    const nextWithoutBuffer = sea === null ? addHoursToIso(etdIso, row.departureManvHours || 0) : addHoursToIso(etdIso, (row.departureManvHours || 0) + sea);
    const totalTimeHours =
      sea === null
        ? null
        : (row.arrivalManvHours || 0) +
          (row.terminalHours || 0) +
          (row.departureManvHours || 0) +
          sea +
          (row.bufferHours || 0);
    const recalculated = {
      ...row,
      seq: index + 1,
      etaIso: currentEtaIso,
      etbIso,
      etdIso,
      distanceNm,
      speed,
      seaTimeHours: sea,
      totalTimeHours,
    };

    currentEtaIso = addHoursToIso(nextWithoutBuffer, row.bufferHours || 0);
    return recalculated;
  });
}

export function recalculateProformaMetrics(
  header: ProformaHeader,
  rows: ProformaRow[],
  distances: DistanceRecord[],
): ProformaRow[] {
  return rows.map((row, index) => updateRowMetrics(row, header, distances, index + 1));
}

export function recalculateEditedProformaRow(row: ProformaRow, timingChanged: boolean): ProformaRow {
  return timingChanged ? recalculateSingleRowTimes(row) : row;
}

export function recalculateProformaFromRow(
  header: ProformaHeader,
  rows: ProformaRow[],
  distances: DistanceRecord[],
  changedIndex: number,
): ProformaRow[] {
  return recalculateFromIndex(header, rows, distances, Math.max(0, changedIndex));
}

export function applyPortRotationToProformaRows(
  header: ProformaHeader,
  rows: ProformaRow[],
  rotation: string[],
  ports: PortMaster[],
  distances: DistanceRecord[],
): ProformaRow[] {
  const queues = new Map<string, ProformaRow[]>();
  rows.forEach((row) => {
    const key = rowKey(row.fromPort, row.toPort);
    const queue = queues.get(key) ?? [];
    queue.push(row);
    queues.set(key, queue);
  });

  const nextRows: ProformaRow[] = [];
  // 새로 추가되거나 변경된 첫 번째 인덱스 추적 (그 앞의 기존 행은 ETA/ETB/ETD 유지)
  let firstChangedIndex = rotation.length - 1;

  for (let index = 0; index < rotation.length - 1; index += 1) {
    const fromPort = rotation[index];
    const toPort = rotation[index + 1];
    const existing = queues.get(rowKey(fromPort, toPort))?.shift();

    if (existing) {
      nextRows.push(updateRowMetrics(existing, header, distances, index + 1));
      continue;
    }

    // 기존에 없던 새 구간 → 이 위치부터 재계산
    firstChangedIndex = Math.min(firstChangedIndex, index);

    const master = getPortMaster(ports, fromPort);
    const distanceNm = getDistance(distances, fromPort, toPort);
    const speed = header.defaultSpeed || rows[index - 1]?.speed || rows[0]?.speed || 0;
    const sea = seaTimeHours(distanceNm, speed);
    const anchorIso = nextRows[index - 1]?.etdIso ?? rows[index]?.etaIso ?? header.baseStartIso ?? BASE_PROFORMA_START_ISO;

    nextRows.push({
      id: createId("pfrow"),
      seq: index + 1,
      fromPort,
      wharf: master?.defaultWharf ?? "",
      toPort,
      bound: "" as BoundCode,
      etaIso: anchorIso,
      etbIso: anchorIso,
      etdIso: anchorIso,
      arrivalManvHours: 0,
      terminalHours: 0,
      departureManvHours: 0,
      distanceNm,
      speed,
      seaTimeHours: sea,
      bufferHours: 0,
      totalTimeHours: sea,
      groupNo: "G1",
      remark: "",
      manualFields: ["newPortCall"],
    });
  }

  return recalculateFromIndex(header, nextRows, distances, firstChangedIndex);
}

export function summarizeProforma(rows: ProformaRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.distanceNm += row.distanceNm ?? 0;
      summary.seaHours += row.seaTimeHours ?? 0;
      summary.bufferHours += row.bufferHours ?? 0;
      summary.maneuverHours += row.arrivalManvHours + row.departureManvHours;
      summary.terminalHours += row.terminalHours;
      summary.totalHours += (row.seaTimeHours ?? 0) + row.bufferHours + row.arrivalManvHours + row.terminalHours + row.departureManvHours;
      return summary;
    },
    {
      distanceNm: 0,
      seaHours: 0,
      bufferHours: 0,
      maneuverHours: 0,
      terminalHours: 0,
      totalHours: 0,
    },
  );
}

export function makeEmptyProforma(): ProformaSchedule {
  const now = new Date().toISOString();
  return {
    header: {
      id: createId("proforma"),
      serviceCode: "",
      serviceName: "",
      versionName: "",
      versionRemark: "",
      defaultSpeed: 0,
      cycleDays: 0,
      cycleWeeks: 0,
      portRotationText: "",
      baseStartIso: BASE_PROFORMA_START_ISO,
      updatedAtIso: now,
    },
    rows: [],
  };
}
