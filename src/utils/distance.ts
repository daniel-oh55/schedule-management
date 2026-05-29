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
  if (reverse) return reverse.distanceNm;

  // 5자리 코드(국가코드+항구코드)인 경우 뒤 3자리만으로 재시도 (예: KRPUS → PUS)
  if (from.length > 3 && to.length > 3) {
    const f3 = from.slice(-3);
    const t3 = to.slice(-3);
    const direct3 = distances.find(
      (r) => normalizePortCode(r.fromPort) === f3 && normalizePortCode(r.toPort) === t3,
    );
    if (direct3) return direct3.distanceNm;
    const reverse3 = distances.find(
      (r) => normalizePortCode(r.fromPort) === t3 && normalizePortCode(r.toPort) === f3,
    );
    if (reverse3) return reverse3.distanceNm;
  }

  return null;
}

export function seaTimeHours(distanceNm: number | null, speed: number): number | null {
  if (distanceNm === null || !speed || speed <= 0) return null;
  return distanceNm / speed;
}
