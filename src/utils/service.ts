import type { ServiceMaster } from "../types/master";

export function findService(services: ServiceMaster[], serviceCode: string): ServiceMaster | undefined {
  return services.find((service) => service.serviceCode.toUpperCase() === serviceCode.trim().toUpperCase());
}
