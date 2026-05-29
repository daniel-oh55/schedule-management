import type { MasterDataSet } from "../types/master";
import { createId } from "../utils/id";
import serviceCodes from "./serviceCodes.json";
import vesselCodes from "./vesselCodes.json";
import portDistancesRaw from "./portDistancesRaw";

function parseCsvDistances(csv: string): MasterDataSet["distances"] {
  return csv
    .split("\n")
    .filter((line) => line.trim())
    .flatMap((line) => {
      const parts = line.split(",");
      if (parts.length < 3) return [];
      const from = parts[0].trim().toUpperCase();
      const to = parts[1].trim().toUpperCase();
      const nm = Number(parts[2].trim());
      if (!from || !to || isNaN(nm) || nm < 0) return [];
      return [{ id: createId("dist"), fromPort: from, toPort: to, distanceNm: nm }];
    });
}

export const demoMasterData: MasterDataSet = {
  services: serviceCodes.map((service) => ({
    id: createId("service"),
    serviceCode: service.serviceCode,
    serviceName: service.serviceName,
  })),
  ports: [
    ["KRPUS", "Busan", "KR", "PNC01", 1, 1, 24],
    ["KRKAN", "Kwangyang", "KR", "KAN04", 1.5, 1.5, 13],
    ["CNSHA", "Shanghai", "CN", "SHAW4", 4, 4, 16],
    ["CNNGB", "Ningbo", "CN", "NGB01", 2, 2, 14],
    ["CNSHK", "Shekou", "CN", "SHE04", 3, 3, 12],
    ["MYPKL", "Port Klang", "MY", "PKL01", 1, 1, 18],
    ["MYPKG", "Port Klang", "MY", "PKL01", 1, 1, 18],
    ["HKHKG", "Hong Kong", "HK", "HKG01", 2, 2, 24],
    ["INNSA", "Nhava Sheva", "IN", "NSA04", 2, 2, 20],
    ["INMUN", "Mundra", "IN", "MUN07", 2, 2, 28],
    ["PKKHI", "Karachi", "PK", "KHI04", 2, 2, 18],
  ].map(([portCode, portName, country, defaultWharf, arrival, departure, terminal]) => ({
    id: createId("port"),
    portCode: String(portCode),
    portName: String(portName),
    country: String(country),
    defaultWharf: String(defaultWharf),
    defaultArrivalManvHours: Number(arrival),
    defaultDepartureManvHours: Number(departure),
    defaultTerminalHours: Number(terminal),
  })),
  vessels: vesselCodes.map((vessel) => ({
    id: createId("vessel"),
    vesselCode: vessel.vesselCode,
    vesselName: vessel.vesselName,
  })),
  distances: parseCsvDistances(portDistancesRaw),
};
