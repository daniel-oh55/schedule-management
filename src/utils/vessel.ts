import type { VesselMaster } from "../types/master";

export function findVessel(vessels: VesselMaster[], vesselCode: string): VesselMaster | undefined {
  return vessels.find((vessel) => vessel.vesselCode.toUpperCase() === vesselCode.trim().toUpperCase());
}
