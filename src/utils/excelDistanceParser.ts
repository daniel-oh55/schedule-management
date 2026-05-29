import * as XLSX from "xlsx";
import type { DistanceRecord } from "../types/master";
import { createId } from "./id";

function cellToPortCode(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toUpperCase();
}

function cellToDistance(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function parseDistanceMatrix(workbook: XLSX.WorkBook): DistanceRecord[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  if (rows.length < 2) return [];

  const headerRowIndex = rows.findIndex(
    (row) => row.filter((cell) => cellToPortCode(cell).length >= 4).length >= 2,
  );
  if (headerRowIndex < 0) return [];

  const headerRow = rows[headerRowIndex];
  const columnPorts = headerRow.map(cellToPortCode);
  const firstPortColumnIndex = columnPorts.findIndex((code) => code.length >= 4);
  const rowPortColumnIndex = Math.max(0, firstPortColumnIndex - 1);
  const records: DistanceRecord[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const fromPort =
      cellToPortCode(row[rowPortColumnIndex]) ||
      cellToPortCode(row.find((cell, index) => index < firstPortColumnIndex && cellToPortCode(cell).length >= 4));
    if (!fromPort || fromPort === "PORT" || fromPort === "FROM") continue;

    for (let colIndex = firstPortColumnIndex; colIndex < row.length; colIndex += 1) {
      const toPort = columnPorts[colIndex];
      const distanceNm = cellToDistance(row[colIndex]);

      if (!toPort || !distanceNm || fromPort === toPort) continue;

      records.push({
        id: createId("dist"),
        fromPort,
        toPort,
        distanceNm,
      });
    }
  }

  return records;
}

export async function parseDistanceFile(file: File): Promise<DistanceRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return parseDistanceMatrix(workbook);
}
