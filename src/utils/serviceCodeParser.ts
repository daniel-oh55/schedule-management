import * as XLSX from "xlsx";
import type { ServiceMaster } from "../types/master";
import { createId } from "./id";

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export function parseServiceCodeWorkbook(workbook: XLSX.WorkBook): ServiceMaster[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });

  return rows
    .slice(1)
    .map((row) => ({
      id: createId("service"),
      serviceCode: normalize(row[0]).toUpperCase(),
      serviceName: normalize(row[1]),
    }))
    .filter((row) => row.serviceCode && row.serviceName);
}

export async function parseServiceCodeFile(file: File): Promise<ServiceMaster[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return parseServiceCodeWorkbook(workbook);
}
