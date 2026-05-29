import type { DistanceRecord } from "../types/master";

function normalizePortCode(value: string): string {
  return value.trim().toUpperCase();
}

export function getDistance(
  distances: DistanceRecord[],
  fromPort: string,
  toPort: string,
): number | null {
  const from = normalizePortCode(fromPort);
  const to = normalizePortCode(toPort);
  if (!from || !to) return null;

  const direct = distances.find(
    (record) =>
      normalizePortCode(record.fromPort) === from && normalizePortCode(record.toPort) === to,
  );

  if (direct) return direct.distanceNm;

  const reverse = distances.find(
    (record) =>
      normalizePortCode(record.fromPort) === to && normalizePortCode(record.toPort) === from,
  );

  return reverse?.distanceNm ?? null;
}

export function seaTimeHours(distanceNm: number | null, speed: number): number | null {
  if (distanceNm === null || !speed || speed <= 0) return null;
  return distanceNm / speed;
}
