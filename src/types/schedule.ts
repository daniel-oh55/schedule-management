export type BoundCode = "W" | "E" | "N" | "S" | "";

export interface ProformaHeader {
  id: string;
  serviceCode: string;
  serviceName: string;
  versionName: string;
  versionRemark: string;
  defaultSpeed: number;
  cycleDays: number;
  cycleWeeks: number;
  portRotationText: string;
  baseStartIso: string;
  updatedAtIso: string;
}

export interface ProformaRow {
  id: string;
  seq: number;
  fromPort: string;
  wharf: string;
  toPort: string;
  bound: BoundCode;
  etaIso: string;
  etbIso: string;
  etdIso: string;
  arrivalManvHours: number;
  terminalHours: number;
  departureManvHours: number;
  distanceNm: number | null;
  speed: number;
  seaTimeHours: number | null;
  bufferHours: number;
  totalTimeHours: number | null;
  groupNo: string;
  remark: string;
  manualFields: string[];
}

export interface ProformaSchedule {
  header: ProformaHeader;
  rows: ProformaRow[];
}

export interface LongTermRow {
  id: string;
  proformaRowId: string;
  seq: number;
  voyage: string;
  fromPort: string;
  wharf: string;
  toPort: string;
  bound: BoundCode;
  etaIso: string;
  etbIso: string;
  etdIso: string;
  distanceNm: number | null;
  speed: number;
  seaTimeHours: number | null;
  bufferHours: number;
  totalTimeHours: number | null;
  groupNo: string;
  remark: string;
}

export interface LongTermSchedule {
  id: string;
  serviceCode: string;
  vesselCode: string;
  vesselName: string;
  voyageFrom: string;
  voyageTo: string;
  firstEtaIso: string;
  rows: LongTermRow[];
  updatedAtIso: string;
}

export interface CoastalRow {
  id: string;
  longTermRowId: string;
  seq: number;
  serviceCode: string;
  vesselCode: string;
  voyage: string;
  fromPort: string;
  wharf: string;
  toPort: string;
  bound: BoundCode;
  longTermEtaIso: string;
  coastalEtaIso: string;
  longTermEtdIso: string;
  coastalEtdIso: string;
  delayHours: number;
  distanceNm: number | null;
  speed: number;
  seaTimeHours: number | null;
  bufferHours: number;
  remark: string;
}

export interface CoastalSchedule {
  id: string;
  longTermScheduleId: string;
  serviceCode: string;
  vesselCode: string;
  voyage: string;
  rows: CoastalRow[];
  updatedAtIso: string;
}
