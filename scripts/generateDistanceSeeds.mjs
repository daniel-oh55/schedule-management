import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const workbook = XLSX.readFile(path.resolve("..", "Distance between ports_20260511.xlsx"));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

function numeric(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function code(country, port) {
  const countryCode = normalize(country);
  const portCode = normalize(port);
  return countryCode && portCode ? `${countryCode}${portCode}` : "";
}

const countryRowIndex = 1;
const portHeaderRowIndex = 2;
const columnCountries = [];
let lastCountry = "";

for (let col = 0; col < rows[portHeaderRowIndex].length; col += 1) {
  const country = normalize(rows[countryRowIndex][col]);
  if (country) lastCountry = country;
  columnCountries[col] = lastCountry;
}

const records = [];
const seen = new Set();
let currentRowCountry = "";

for (let rowIndex = portHeaderRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
  const row = rows[rowIndex];
  const rowCountry = normalize(row[1]);
  if (rowCountry) currentRowCountry = rowCountry;
  const fromPort = code(currentRowCountry, row[2]);
  if (!fromPort) continue;

  for (let col = 0; col < row.length; col += 1) {
    const toPort = code(columnCountries[col], rows[portHeaderRowIndex][col]);
    const distanceNm = numeric(row[col]);
    if (!toPort || !distanceNm || fromPort === toPort) continue;

    const key = `${fromPort}__${toPort}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({
      id: `dist_${fromPort.toLowerCase()}_${toPort.toLowerCase()}`,
      fromPort,
      toPort,
      distanceNm,
    });
  }
}

fs.writeFileSync(path.resolve("src", "data", "distanceSeeds.json"), JSON.stringify(records, null, 2));
console.log(records.length);
console.log(records.filter((r) => ["KRKAN__CNNGB", "CNSHA__CNSHK", "MYPKG__HKHKG"].includes(`${r.fromPort}__${r.toPort}`)));
