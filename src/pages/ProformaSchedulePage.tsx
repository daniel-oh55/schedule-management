import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Download, FilePlus2, Plus, RotateCw, Save, Upload } from "lucide-react";
import type { AppContext } from "../App";
import { EditableGrid, type GridColumn } from "../components/EditableGrid";
import { Panel } from "../components/Panel";
import { ServiceCodeInput } from "../components/ServiceCodeInput";
import { StatusStrip } from "../components/StatusStrip";
import { TimeInput } from "../components/TimeInput";
import { storageRepository } from "../repositories/storageRepository";
import type { ProformaHeader, ProformaRow, ProformaSchedule } from "../types/schedule";
import { downloadJson, readJsonFile } from "../utils/jsonTransfer";
import { createId } from "../utils/id";
import { findService } from "../utils/service";
import {
  buildProformaRows,
  makeEmptyProforma,
  parsePortRotation,
  recalculateProformaRows,
  summarizeProforma,
} from "../utils/proformaCalculator";
import {
  BASE_PROFORMA_START_ISO,
  formatDate,
  formatDayName,
  formatDuration,
  formatTime,
  setIsoDate,
  setIsoTime,
} from "../utils/time";

interface ProformaSchedulePageProps {
  appContext: AppContext;
}

export function ProformaSchedulePage({ appContext }: ProformaSchedulePageProps) {
  function createInitialSchedule() {
    const empty = makeEmptyProforma();
    return { ...empty, rows: buildProformaRows(empty.header, appContext.masterData.ports, appContext.masterData.distances) };
  }

  const [schedule, setSchedule] = useState<ProformaSchedule>(() => {
    return createInitialSchedule();
  });
  const [rotationSlotCount, setRotationSlotCount] = useState(8);

  useEffect(() => {
    setSchedule((current) => ({
      ...current,
      rows: recalculateProformaRows(current.header, current.rows, appContext.masterData.distances),
    }));
  }, [appContext.masterData.distances]);

  const summary = useMemo(() => summarizeProforma(schedule.rows), [schedule.rows]);
  const rotationPorts = useMemo(() => parsePortRotation(schedule.header.portRotationText), [schedule.header.portRotationText]);
  const rotationInputCount = Math.max(rotationSlotCount, rotationPorts.length + 1);
  const rotationInputs = Array.from({ length: rotationInputCount }, (_, index) => rotationPorts[index] ?? "");
  const serviceProformas = useMemo(
    () =>
      schedule.header.serviceCode
        ? appContext.proformas.filter(
            (item) => item.header.serviceCode.toUpperCase() === schedule.header.serviceCode.toUpperCase(),
          )
        : appContext.proformas,
    [appContext.proformas, schedule.header.serviceCode],
  );

  function setRotationPorts(ports: string[]) {
    updateHeader({
      portRotationText: ports
        .map((port) => port.trim().toUpperCase())
        .filter(Boolean)
        .join(" > "),
    });
  }

  function updateRotationPort(index: number, value: string) {
    const next = [...rotationInputs];
    next[index] = value.toUpperCase();
    setRotationPorts(next);
  }

  function addRotationPort() {
    setRotationSlotCount((count) => count + 1);
  }

  function updateHeader(patch: Partial<ProformaHeader>) {
    setSchedule((current) => {
      const header = {
        ...current.header,
        ...patch,
        cycleDays:
          patch.cycleWeeks !== undefined ? Number(patch.cycleWeeks) * 7 : patch.cycleDays ?? current.header.cycleDays,
        cycleWeeks:
          patch.cycleDays !== undefined ? Number(patch.cycleDays) / 7 : patch.cycleWeeks ?? current.header.cycleWeeks,
        updatedAtIso: new Date().toISOString(),
      };

      return {
        header,
        rows: recalculateProformaRows(header, current.rows, appContext.masterData.distances),
      };
    });
  }

  function generateRows() {
    setSchedule((current) => ({
      header: { ...current.header, baseStartIso: current.header.baseStartIso || BASE_PROFORMA_START_ISO },
      rows: buildProformaRows(current.header, appContext.masterData.ports, appContext.masterData.distances),
    }));
  }

  function updateRow(rowId: string, patch: Partial<ProformaRow>) {
    setSchedule((current) => {
      const rows = current.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...patch,
              manualFields: Array.from(new Set([...row.manualFields, ...Object.keys(patch)])),
            }
          : row,
      );

      return {
        ...current,
        rows: recalculateProformaRows(current.header, rows, appContext.masterData.distances),
      };
    });
  }

  function updateFirstEtaDate(dateText: string) {
    setSchedule((current) => {
      const header = { ...current.header, baseStartIso: setIsoDate(current.header.baseStartIso, dateText) };
      return { header, rows: recalculateProformaRows(header, current.rows, appContext.masterData.distances) };
    });
  }

  function updateFirstEtaTime(timeText: string) {
    setSchedule((current) => {
      const header = { ...current.header, baseStartIso: setIsoTime(current.header.baseStartIso, timeText) };
      return { header, rows: recalculateProformaRows(header, current.rows, appContext.masterData.distances) };
    });
  }

  function save() {
    storageRepository.saveProforma({
      ...schedule,
      header: { ...schedule.header, versionName: schedule.header.versionName || "V1", updatedAtIso: new Date().toISOString() },
    });
    appContext.refresh();
  }

  function load(proformaId: string) {
    const saved = storageRepository.getProforma(proformaId);
    if (saved) {
      setRotationSlotCount(Math.max(8, parsePortRotation(saved.header.portRotationText).length + 1));
      setSchedule({
        ...saved,
        header: { ...saved.header, versionName: saved.header.versionName || "V1" },
      });
    }
  }

  function clear() {
    setRotationSlotCount(8);
    setSchedule(createInitialSchedule());
  }

  function selectServiceCode(serviceCode: string) {
    const service = findService(appContext.masterData.services, serviceCode);
    const matched = appContext.proformas
      .filter((item) => item.header.serviceCode.toUpperCase() === serviceCode.trim().toUpperCase())
      .sort((a, b) => {
        const aSeed = a.header.id.startsWith("proforma_seed_");
        const bSeed = b.header.id.startsWith("proforma_seed_");
        if (aSeed !== bSeed) return aSeed ? 1 : -1;
        return b.header.updatedAtIso.localeCompare(a.header.updatedAtIso);
      })[0];

    if (matched) {
      load(matched.header.id);
      return;
    }

    updateHeader({
      serviceCode,
      serviceName: service?.serviceName ?? "",
    });
  }

  function newVersion() {
    setSchedule((current) => {
      const sameServiceCount = appContext.proformas.filter(
        (item) => item.header.serviceCode.toUpperCase() === current.header.serviceCode.toUpperCase(),
      ).length;

      return {
        header: {
          ...current.header,
          id: createId("proforma"),
          versionName: `V${sameServiceCount + 1}`,
          updatedAtIso: new Date().toISOString(),
        },
        rows: current.rows.map((row) => ({ ...row, id: createId("pfrow") })),
      };
    });
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imported = await readJsonFile<ProformaSchedule>(file);
    setSchedule(imported);
    event.target.value = "";
  }

  const columns: GridColumn<ProformaRow>[] = [
    { key: "seq", header: "Seq", width: "48px", align: "center", render: (row) => row.seq },
    {
      key: "from",
      header: "From",
      width: "76px",
      render: (row) => <input className="grid-cell-input" value={row.fromPort} onChange={(e) => updateRow(row.id, { fromPort: e.target.value.toUpperCase() })} />,
    },
    {
      key: "wharf",
      header: "Wharf",
      width: "82px",
      render: (row) => <input className="grid-cell-input" value={row.wharf} onChange={(e) => updateRow(row.id, { wharf: e.target.value.toUpperCase() })} />,
    },
    {
      key: "to",
      header: "To",
      width: "76px",
      render: (row) => <input className="grid-cell-input" value={row.toPort} onChange={(e) => updateRow(row.id, { toPort: e.target.value.toUpperCase() })} />,
    },
    {
      key: "bound",
      header: "Bound",
      width: "64px",
      render: (row) => <input className="grid-cell-input text-center" value={row.bound} onChange={(e) => updateRow(row.id, { bound: e.target.value.toUpperCase().slice(0, 1) as ProformaRow["bound"] })} />,
    },
    { key: "etaDay", header: "ETA Day", width: "74px", className: "eta-cell border-l-2 border-sky-300", render: (row) => formatDayName(row.etaIso) },
    { key: "etaTime", header: "ETA Time", width: "82px", className: "eta-cell border-r-2 border-sky-300", render: (row) => formatTime(row.etaIso) },
    {
      key: "arrManv",
      header: "Arrival Manv",
      width: "102px",
      render: (row) => <TimeInput value={row.arrivalManvHours} onChange={(value) => updateRow(row.id, { arrivalManvHours: value })} />,
    },
    { key: "etbDay", header: "ETB Day", width: "74px", className: "etb-cell border-l-2 border-emerald-300", render: (row) => formatDayName(row.etbIso) },
    { key: "etbTime", header: "ETB Time", width: "82px", className: "etb-cell border-r-2 border-emerald-300", render: (row) => formatTime(row.etbIso) },
    {
      key: "terminal",
      header: "Terminal Time",
      width: "108px",
      render: (row) => <TimeInput value={row.terminalHours} onChange={(value) => updateRow(row.id, { terminalHours: value })} />,
    },
    { key: "etdDay", header: "ETD Day", width: "74px", className: "etd-cell border-l-2 border-amber-300", render: (row) => formatDayName(row.etdIso) },
    { key: "etdTime", header: "ETD Time", width: "82px", className: "etd-cell border-r-2 border-amber-300", render: (row) => formatTime(row.etdIso) },
    {
      key: "depManv",
      header: "Departure Manv",
      width: "118px",
      render: (row) => <TimeInput value={row.departureManvHours} onChange={(value) => updateRow(row.id, { departureManvHours: value })} />,
    },
    { key: "distance", header: "Distance", width: "82px", align: "right", className: "auto-cell", render: (row) => row.distanceNm?.toLocaleString() ?? "" },
    {
      key: "speed",
      header: "Speed",
      width: "72px",
      render: (row) => <input className="grid-cell-input text-right" type="number" step="0.1" value={row.speed} onChange={(e) => updateRow(row.id, { speed: Number(e.target.value) })} />,
    },
    { key: "sea", header: "Sea Time", width: "88px", align: "right", className: "auto-cell", render: (row) => formatDuration(row.seaTimeHours) },
    {
      key: "buffer",
      header: "Buffer",
      width: "82px",
      render: (row) => <TimeInput value={row.bufferHours} onChange={(value) => updateRow(row.id, { bufferHours: value })} />,
    },
    { key: "total", header: "Total Time", width: "94px", align: "right", className: "auto-cell", render: (row) => formatDuration(row.totalTimeHours) },
    {
      key: "group",
      header: "Group No",
      width: "78px",
      render: (row) => <input className="grid-cell-input" value={row.groupNo} onChange={(e) => updateRow(row.id, { groupNo: e.target.value })} />,
    },
    {
      key: "remark",
      header: "Remark",
      width: "180px",
      render: (row) => <input className="grid-cell-input" value={row.remark} onChange={(e) => updateRow(row.id, { remark: e.target.value })} />,
    },
  ];

  return (
    <div>
      <Panel
        title="Search / Service"
        actions={
          <div className="flex items-center gap-2">
            <select className="field-input h-8 w-72" value={schedule.header.id} onChange={(event) => load(event.target.value)}>
              <option value="">Load saved Proforma</option>
              {serviceProformas.map((item) => (
                <option key={item.header.id} value={item.header.id}>
                  {item.header.serviceCode} / {item.header.versionName || "V1"} - {item.header.serviceName}
                </option>
              ))}
            </select>
            <button className="action-button" type="button" onClick={clear}>
              <Plus size={15} /> New
            </button>
            <button className="action-button" type="button" onClick={newVersion}>
              <FilePlus2 size={15} /> New Version
            </button>
            <button className="action-button" type="button" onClick={() => downloadJson(`${schedule.header.serviceCode || "proforma"}.json`, schedule)}>
              <Download size={15} /> Export JSON
            </button>
            <label className="action-button cursor-pointer">
              <Upload size={15} /> Import JSON
              <input className="hidden" type="file" accept="application/json" onChange={importJson} />
            </label>
            <button className="primary-button" type="button" onClick={save}>
              <Save size={15} /> Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-[140px_220px_110px_120px_110px_110px_120px_auto] gap-2">
          <label>
            <div className="field-label">Service Code</div>
            <ServiceCodeInput
              id="proforma-service-code"
              services={appContext.masterData.services}
              value={schedule.header.serviceCode}
              onChange={selectServiceCode}
            />
          </label>
          <label>
            <div className="field-label">Service Name</div>
            <input className="field-input" value={schedule.header.serviceName} onChange={(e) => updateHeader({ serviceName: e.target.value })} />
          </label>
          <label>
            <div className="field-label">Version</div>
            <input className="field-input" value={schedule.header.versionName || "V1"} onChange={(e) => updateHeader({ versionName: e.target.value })} />
          </label>
          <label>
            <div className="field-label">Default Speed</div>
            <input className="field-input" type="number" step="0.1" value={schedule.header.defaultSpeed} onChange={(e) => updateHeader({ defaultSpeed: Number(e.target.value) })} />
          </label>
          <label>
            <div className="field-label">Cycle Days</div>
            <input className="field-input" type="number" value={schedule.header.cycleDays} onChange={(e) => updateHeader({ cycleDays: Number(e.target.value) })} />
          </label>
          <label>
            <div className="field-label">Cycle Weeks</div>
            <input className="field-input" type="number" step="0.5" value={schedule.header.cycleWeeks} onChange={(e) => updateHeader({ cycleWeeks: Number(e.target.value) })} />
          </label>
          <label>
            <div className="field-label">Base ETA Date</div>
            <input className="field-input" type="date" value={formatDate(schedule.header.baseStartIso)} onChange={(e) => updateFirstEtaDate(e.target.value)} />
          </label>
          <button className="primary-button mt-[18px]" type="button" onClick={generateRows}>
            <RotateCw size={15} /> Generate
          </button>
        </div>
        <div className="mt-2 grid grid-cols-[120px_1fr] gap-2">
          <label>
            <div className="field-label">First ETA Time</div>
            <input className="field-input" type="time" value={formatTime(schedule.header.baseStartIso)} onChange={(e) => updateFirstEtaTime(e.target.value)} />
          </label>
          <div className="pt-[18px] text-xs text-slate-500">
            Auto-calculated cells are shaded. Editable cells stay white. Distance is looked up from Master Data.
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="field-label">Port Rotation</div>
            <button className="action-button h-7" type="button" onClick={addRotationPort}>
              <Plus size={14} /> Add Port
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-300 bg-slate-50 p-2">
            <div className="flex min-w-max items-center gap-1">
              {rotationInputs.map((port, index) => (
                <div key={`${index}-${port}`} className="flex items-center gap-1">
                  <input
                    className="h-8 w-24 rounded border border-slate-300 bg-white px-2 text-sm font-semibold uppercase outline-none focus:border-port focus:ring-2 focus:ring-blue-100"
                    placeholder={`Port ${index + 1}`}
                    value={port}
                    onChange={(event) => updateRotationPort(index, event.target.value)}
                  />
                  {index < rotationInputs.length - 1 && <span className="text-slate-400">&gt;</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <StatusStrip {...summary} />

      <div className="mt-3">
        <EditableGrid columns={columns} rows={schedule.rows} getRowKey={(row) => row.id} />
      </div>
    </div>
  );
}
