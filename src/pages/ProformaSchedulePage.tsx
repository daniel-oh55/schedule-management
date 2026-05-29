import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Download, FilePlus2, Plus, Search, Save, Upload } from "lucide-react";
import type { AppContext } from "../App";
import { EditableGrid, type GridColumn } from "../components/EditableGrid";
import { NumberCellInput } from "../components/NumberCellInput";
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
  applyPortRotationToProformaRows,
  buildProformaRows,
  makeEmptyProforma,
  parsePortRotation,
  recalculateProformaFromRow,
  recalculateProformaMetrics,
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
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedProformaId, setSelectedProformaId] = useState("");
  const [rotationDraft, setRotationDraft] = useState<string[]>(Array.from({ length: 8 }, () => ""));
  const [rotationSlotCount, setRotationSlotCount] = useState(8);
  const [draggedPortIndex, setDraggedPortIndex] = useState<number | null>(null);

  useEffect(() => {
    setSchedule((current) => ({
      ...current,
      rows: recalculateProformaMetrics(current.header, current.rows, appContext.masterData.distances),
    }));
  }, [appContext.masterData.distances]);

  useEffect(() => {
    setServiceQuery(schedule.header.serviceCode);
  }, [schedule.header.serviceCode]);

  const summary = useMemo(() => summarizeProforma(schedule.rows), [schedule.rows]);
  const serviceProformas = useMemo(
    () =>
      serviceQuery
        ? appContext.proformas.filter(
            (item) => item.header.serviceCode.toUpperCase() === serviceQuery.toUpperCase(),
          )
        : appContext.proformas,
    [appContext.proformas, serviceQuery],
  );

  function syncRotationDraftFromText(text: string) {
    const ports = parsePortRotation(text);
    setRotationDraft(Array.from({ length: Math.max(8, ports.length + 1) }, (_, index) => ports[index] ?? ""));
    setRotationSlotCount(Math.max(8, ports.length + 1));
  }

  function updateRotationPort(index: number, value: string) {
    setRotationDraft((current) => {
      const next = [...current];
      next[index] = value.toUpperCase();
      return next;
    });
  }

  function addRotationPort() {
    setRotationSlotCount((count) => count + 1);
    setRotationDraft((current) => [...current, ""]);
  }

  function rotationTextFromDraft() {
    return rotationDraft
      .map((port) => port.trim().toUpperCase())
      .filter(Boolean)
      .join(" > ");
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
        rows: recalculateProformaMetrics(header, current.rows, appContext.masterData.distances),
      };
    });
  }

  function generateRows() {
    const portRotationText = rotationTextFromDraft();
    const rotation = parsePortRotation(portRotationText);

    setSchedule((current) => ({
      header: { ...current.header, portRotationText, baseStartIso: current.header.baseStartIso || BASE_PROFORMA_START_ISO },
      rows:
        current.rows.length > 0
          ? applyPortRotationToProformaRows(
              { ...current.header, portRotationText },
              current.rows,
              rotation,
              appContext.masterData.ports,
              appContext.masterData.distances,
            )
          : buildProformaRows(
              {
                ...current.header,
                portRotationText,
              },
              appContext.masterData.ports,
              appContext.masterData.distances,
            ),
    }));
  }

  function updateRow(rowId: string, patch: Partial<ProformaRow>) {
    setSchedule((current) => {
      const changedIndex = current.rows.findIndex((row) => row.id === rowId);
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
        rows: recalculateProformaFromRow(
          current.header,
          rows,
          appContext.masterData.distances,
          changedIndex < 0 ? 0 : changedIndex,
        ),
      };
    });
  }

  function updateFirstEtaDate(dateText: string) {
    setSchedule((current) => {
      const header = { ...current.header, baseStartIso: setIsoDate(current.header.baseStartIso, dateText) };
      return { header, rows: recalculateProformaMetrics(header, current.rows, appContext.masterData.distances) };
    });
  }

  function updateFirstEtaTime(timeText: string) {
    setSchedule((current) => {
      const header = { ...current.header, baseStartIso: setIsoTime(current.header.baseStartIso, timeText) };
      return { header, rows: recalculateProformaMetrics(header, current.rows, appContext.masterData.distances) };
    });
  }

  function save() {
    storageRepository.saveProforma({
      ...schedule,
      header: {
        ...schedule.header,
        portRotationText: rotationTextFromDraft(),
        versionName: schedule.header.versionName || "V1",
        versionRemark: schedule.header.versionRemark || "",
        updatedAtIso: new Date().toISOString(),
      },
    });
    appContext.refresh();
  }

  function load(proformaId: string) {
    const saved = storageRepository.getProforma(proformaId);
    if (saved) {
      syncRotationDraftFromText(saved.header.portRotationText);
      setSelectedProformaId(saved.header.id);
      setSchedule({
        ...saved,
        header: { ...saved.header, versionName: saved.header.versionName || "V1", versionRemark: saved.header.versionRemark || "" },
      });
    }
  }

  function clear() {
    setRotationSlotCount(8);
    setRotationDraft(Array.from({ length: 8 }, () => ""));
    setServiceQuery("");
    setSelectedProformaId("");
    setSchedule(createInitialSchedule());
  }

  function searchServiceCode() {
    const serviceCode = serviceQuery.trim().toUpperCase();
    const service = findService(appContext.masterData.services, serviceCode);
    const matched = appContext.proformas
      .filter((item) => item.header.serviceCode.toUpperCase() === serviceCode)
      .sort((a, b) => {
        const aSeed = a.header.id.startsWith("proforma_seed_");
        const bSeed = b.header.id.startsWith("proforma_seed_");
        if (aSeed !== bSeed) return aSeed ? 1 : -1;
        return b.header.updatedAtIso.localeCompare(a.header.updatedAtIso);
      })
      .find((item) => item.header.id === selectedProformaId) ??
      appContext.proformas
        .filter((item) => item.header.serviceCode.toUpperCase() === serviceCode)
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
          versionRemark: "",
          updatedAtIso: new Date().toISOString(),
        },
        rows: current.rows.map((row) => ({ ...row, id: createId("pfrow") })),
      };
    });
    setSelectedProformaId("");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imported = await readJsonFile<ProformaSchedule>(file);
    syncRotationDraftFromText(imported.header.portRotationText);
    setSchedule({ ...imported, header: { ...imported.header, versionRemark: imported.header.versionRemark || "" } });
    setSelectedProformaId(imported.header.id);
    event.target.value = "";
  }

  function reorderPort(dragIndex: number, targetIndex: number) {
    if (dragIndex === targetIndex || !schedule.rows.length) return;

    const ports = [...schedule.rows.map((row) => row.fromPort), schedule.rows[schedule.rows.length - 1].toPort];
    const [moved] = ports.splice(dragIndex, 1);
    ports.splice(dragIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, moved);

    setRotationDraft(Array.from({ length: Math.max(8, ports.length + 1) }, (_, index) => ports[index] ?? ""));
    setRotationSlotCount(Math.max(8, ports.length + 1));
    setSchedule((current) => ({
      ...current,
      header: { ...current.header, portRotationText: ports.join(" > ") },
      rows: applyPortRotationToProformaRows(
        { ...current.header, portRotationText: ports.join(" > ") },
        current.rows,
        ports,
        appContext.masterData.ports,
        appContext.masterData.distances,
      ),
    }));
  }

  const columns: GridColumn<ProformaRow>[] = [
    { key: "seq", header: "Seq", width: "48px", align: "center", render: (row) => row.seq },
    {
      key: "from",
      header: "From",
      width: "76px",
      render: (row, rowIndex) => (
        <div
          draggable
          className="cursor-move"
          title="Drag to reorder this port"
          onDragStart={() => setDraggedPortIndex(rowIndex)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggedPortIndex !== null) reorderPort(draggedPortIndex, rowIndex);
            setDraggedPortIndex(null);
          }}
        >
          <input className="grid-cell-input" value={row.fromPort} onChange={(e) => updateRow(row.id, { fromPort: e.target.value.toUpperCase() })} />
        </div>
      ),
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
      render: (row) => (
        <TimeInput
          value={row.terminalHours}
          className={row.manualFields.includes("newPortCall") && row.terminalHours === 0 ? "font-bold text-red-600" : ""}
          onChange={(value) => updateRow(row.id, { terminalHours: value })}
        />
      ),
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
      render: (row) => <NumberCellInput className="text-right" value={row.speed} onChange={(value) => updateRow(row.id, { speed: value })} />,
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
            <select className="field-input h-8 w-72" value={selectedProformaId} onChange={(event) => setSelectedProformaId(event.target.value)}>
              <option value="">Select Version</option>
              {serviceProformas.map((item) => (
                <option key={item.header.id} value={item.header.id}>
                  {item.header.versionName || "V1"} {item.header.versionRemark ? `- ${item.header.versionRemark}` : ""}
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
        <div className="grid grid-cols-[140px_220px_110px_180px_120px_110px_110px_120px] gap-2">
          <label>
            <div className="field-label">Service Code</div>
            <ServiceCodeInput
              id="proforma-service-code"
              services={appContext.masterData.services}
              value={serviceQuery}
              onChange={setServiceQuery}
              className="field-input"
            />
          </label>
          <label>
            <div className="field-label">Service Name</div>
            <input className="field-input" value={schedule.header.serviceName} onChange={(e) => updateHeader({ serviceName: e.target.value })} />
          </label>
          <label>
            <div className="field-label">Version</div>
            <select className="field-input" value={selectedProformaId} onChange={(event) => setSelectedProformaId(event.target.value)}>
              <option value="">New version</option>
              {serviceProformas.map((item) => (
                <option key={item.header.id} value={item.header.id}>
                  {item.header.versionName || "V1"}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2">
            <div className="field-label">Version Remark</div>
            <input
              className="field-input"
              value={schedule.header.versionRemark || ""}
              onChange={(event) => updateHeader({ versionRemark: event.target.value })}
              placeholder="e.g. 2026 base rotation"
            />
          </label>
          <button className="action-button mt-[18px] justify-center" type="button" onClick={searchServiceCode} title="Search service">
            <Search size={15} />
            조회
          </button>
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
            <div className="flex items-center gap-2">
              <button className="primary-button h-7" type="button" onClick={generateRows}>
                Apply
              </button>
              <button className="action-button h-7" type="button" onClick={addRotationPort}>
                <Plus size={14} /> Add Port
              </button>
            </div>
          </div>
          <div className="overflow-x-auto border border-slate-300 bg-slate-50 p-2">
            <div className="flex min-w-max items-center gap-1">
              {rotationDraft.map((port, index) => (
                <div key={`rotation-port-${index}`} className="flex items-center gap-1">
                  <input
                    className="h-8 w-24 rounded border border-slate-300 bg-white px-2 text-sm font-semibold uppercase outline-none focus:border-port focus:ring-2 focus:ring-blue-100"
                    placeholder={`Port ${index + 1}`}
                    value={port}
                    onChange={(event) => updateRotationPort(index, event.target.value)}
                    onBlur={generateRows}
                    onKeyDown={index === rotationDraft.length - 1 ? (e) => { if (e.key === "Enter") generateRows(); } : undefined}
                  />
                  {index < rotationDraft.length - 1 && <span className="text-slate-400">&gt;</span>}
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
