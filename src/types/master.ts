export interface PortMaster {
  id: string;
  portCode: string;
  portName: string;
  country: string;
  defaultWharf: string;
  defaultArrivalManvHours: number;
  defaultDepartureManvHours: number;
  defaultTerminalHours: number;
}

export interface VesselMaster {
  id: string;
  vesselCode: string;
  vesselName: string;
}

export interface ServiceMaster {
  id: string;
  serviceCode: string;
  serviceName: string;
}

export interface DistanceRecord {
  id: string;
  fromPort: string;
  toPort: string;
  distanceNm: number;
}

export interface MasterDataSet {
  services: ServiceMaster[];
  ports: PortMaster[];
  vessels: VesselMaster[];
  distances: DistanceRecord[];
}
