import * as XLSX from "xlsx";
import type { VesselMaster } from "../types/master";
import { createId } from "./id";

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export function parseVesselCodeWorkbook(workbook: XLSX.WorkBook): VesselMaster[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const header = (rows[0] ?? []).map((value) => normalize(value));
  const codeIndex = header.findIndex((value) => value === "선박코드" || value.toUpperCase() === "VESSEL CODE");
  const nameIndex = header.findIndex((value) => value === "선박명" || value.toUpperCase() === "VESSEL NAME");
  const fallbackCodeIndex = codeIndex >= 0 ? codeIndex : 1;
  const fallbackNameIndex = nameIndex >= 0 ? nameIndex : 2;

  return rows
    .slice(1)
    .map((row) => ({
      id: createId("vessel"),
      vesselCode: normalize(row[fallbackCodeIndex]).toUpperCase(),
      vesselName: normalize(row[fallbackNameIndex]).toUpperCase(),
    }))
    .filter((row) => row.vesselCode && row.vesselName);
}

export async function parseVesselCodeFile(file: File): Promise<VesselMaster[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return parseVesselCodeWorkbook(workbook);
}
