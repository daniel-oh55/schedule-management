import type { MasterDataSet } from "../types/master";
import { createId } from "../utils/id";
import serviceCodes from "./serviceCodes.json";
import vesselCodes from "./vesselCodes.json";

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
  distances: [
    ["KRPUS", "KRKAN", 90],
    ["KRKAN", "CNSHA", 397],
    ["CNSHA", "CNNGB", 95],
    ["CNNGB", "CNSHK", 769],
    ["CNSHK", "MYPKL", 1622],
    ["MYPKL", "INNSA", 2242],
    ["INNSA", "INMUN", 389],
    ["INMUN", "PKKHI", 280],
    ["PKKHI", "MYPKL", 2694],
    ["MYPKL", "KRPUS", 2688],
  ].map(([fromPort, toPort, distanceNm]) => ({
    id: createId("dist"),
    fromPort: String(fromPort),
    toPort: String(toPort),
    distanceNm: Number(distanceNm),
  })),
};
