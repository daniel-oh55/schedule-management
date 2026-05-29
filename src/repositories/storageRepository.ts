import type { MasterDataSet } from "../types/master";
import type { CoastalSchedule, LongTermSchedule, ProformaSchedule } from "../types/schedule";
import { demoMasterData } from "../data/demoData";

const KEYS = {
  master: "sm.masterData.v1",
  proformas: "sm.proformas.v1",
  longTerms: "sm.longTerms.v1",
  coastals: "sm.coastals.v1",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeByCode<T>(saved: T[] | undefined, seeded: T[], getCode: (item: T) => string): T[] {
  const merged = new Map<string, T>();

  seeded.forEach((item) => merged.set(getCode(item).toUpperCase(), item));
  saved?.forEach((item) => merged.set(getCode(item).toUpperCase(), item));

  return Array.from(merged.values());
}

function normalizeMasterData(value: MasterDataSet): MasterDataSet {
  return {
    ...value,
    services: mergeByCode(value.services, demoMasterData.services, (service) => service.serviceCode),
    vessels: mergeByCode(value.vessels, demoMasterData.vessels, (vessel) => vessel.vesselCode),
  };
}

export const storageRepository = {
  getMasterData(): MasterDataSet {
    return normalizeMasterData(read(KEYS.master, demoMasterData));
  },

  saveMasterData(value: MasterDataSet): void {
    write(KEYS.master, value);
  },

  listProformas(): ProformaSchedule[] {
    return read(KEYS.proformas, []);
  },

  saveProforma(schedule: ProformaSchedule): void {
    const list = storageRepository.listProformas();
    const next = [schedule, ...list.filter((item) => item.header.id !== schedule.header.id)];
    write(KEYS.proformas, next);
  },

  getProforma(id: string): ProformaSchedule | undefined {
    return storageRepository.listProformas().find((item) => item.header.id === id);
  },

  listLongTerms(): LongTermSchedule[] {
    return read(KEYS.longTerms, []);
  },

  saveLongTerm(schedule: LongTermSchedule): void {
    const list = storageRepository.listLongTerms();
    const next = [schedule, ...list.filter((item) => item.id !== schedule.id)];
    write(KEYS.longTerms, next);
  },

  listCoastals(): CoastalSchedule[] {
    return read(KEYS.coastals, []);
  },

  saveCoastal(schedule: CoastalSchedule): void {
    const list = storageRepository.listCoastals();
    const next = [schedule, ...list.filter((item) => item.id !== schedule.id)];
    write(KEYS.coastals, next);
  },
};
