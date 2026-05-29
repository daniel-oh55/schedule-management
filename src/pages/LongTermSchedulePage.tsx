import { useMemo, useState } from "react";
import { getDay } from "date-fns";
import { RotateCcw, RotateCw, Save } from "lucide-react";
import type { AppContext } from "../App";
import { EditableGrid, type GridColumn } from "../components/EditableGrid";
import { MiniCalendar } from "../components/MiniCalendar";
import { Panel } from "../components/Panel";
import { ServiceCodeInput } from "../components/ServiceCodeInput";
import { storageRepository } from "../repositories/storageRepository";
import type { LongTermRow, LongTermSchedule } from "../types/schedule";
import { generateLongTermSchedule } from "../utils/longTermGenerator";
import { findService } from "../utils/service";
import { combineDateTime, formatDate, formatDuration, formatTime, setIsoDate, setIsoTime } from "../utils/time";

interface LongTermSchedulePageProps {
  appContext: AppContext;
}

export function LongTermSchedulePage({ appContext }: LongTermSchedulePageProps) {
  const [serviceCode, setServiceCode] = useState(appContext.proformas[0]?.header.serviceCode ?? "");
  const [proformaId, setProformaId] = useState(appContext.proformas[0]?.header.id ?? "");
  const [vesselCode, setVesselCode] = useState(appContext.masterData.vessels[0]?.vesselCode ?? "");
  const [vesselName, setVesselName] = useState(appContext.masterData.vessels[0]?.vesselName ?? "");
  const [voyageFrom, setVoyageFrom] = useState("2601");
  const [voyageTo, setVoyageTo] = useState("2602");
  const [firstEtaIso, setFirstEtaIso] = useState(combineDateTime("2026-06-01", "08:00"));
  const [calendarMonthIso, setCalendarMonthIso] = useState(firstEtaIso);
  const [schedule, setSchedule] = useState<LongTermSchedule | null>(null);

  const filteredProformas = useMemo(
    () =>
      serviceCode
        ? appContext.proformas.filter((item) => item.header.serviceCode.toUpperCase() === serviceCode.toUpperCase())
        : appContext.proformas,
    [appContext.proformas, serviceCode],
  );

  const selectedProforma = useMemo(
    () => appContext.proformas.find((item) => item.header.id === proformaId),
    [appContext.proformas, proformaId],
  );

  const serviceName = findService(appContext.masterData.services, serviceCode)?.serviceName ?? selectedProforma?.header.serviceName ?? "";

  const highlightedWeekday = selectedProforma
    ? getDay(new Date(selectedProforma.rows[0]?.etaIso || selectedProforma.header.baseStartIso))
    : null;

  function selectVessel(code: string) {
    const vessel = appContext.masterData.vessels.find((item) => item.vesselCode === code);
    setVesselCode(code);
    setVesselName(vessel?.vesselName ?? "");
  }

  function selectServiceCode(code: string) {
    const nextCode = code.toUpperCase();
    setServiceCode(nextCode);
    const nextProforma = appContext.proformas.find(
      (item) => item.header.serviceCode.toUpperCase() === nextCode,
    );
    setProformaId(nextProforma?.header.id ?? "");
    setSchedule(null);
  }

  function generate() {
    if (!selectedProforma) return;
    setSchedule(generateLongTermSchedule(selectedProforma, vesselCode, vesselName, voyageFrom, voyageTo, firstEtaIso));
  }

  function save() {
    if (!schedule) return;
    storageRepository.saveLongTerm(schedule);
    appContext.refresh();
  }

  function clear() {
    const defaultVessel = appContext.masterData.vessels[0];
    const defaultProforma = appContext.proformas[0];
    setServiceCode(defaultProforma?.header.serviceCode ?? "");
    setProformaId(defaultProforma?.header.id ?? "");
    setVesselCode(defaultVessel?.vesselCode ?? "");
    setVesselName(defaultVessel?.vesselName ?? "");
    setVoyageFrom("2601");
    setVoyageTo("2602");
    const resetEta = combineDateTime("2026-06-01", "08:00");
    setFirstEtaIso(resetEta);
    setCalendarMonthIso(resetEta);
    setSchedule(null);
  }

  const columns: GridColumn<LongTermRow>[] = [
    { key: "seq", header: "Seq", width: "48px", align: "center", className: "readonly-cell", render: (row) => row.seq },
    { key: "voyage", header: "Voyage", width: "72px", className: "readonly-cell", render: (row) => row.voyage },
    { key: "from", header: "From", width: "78px", className: "readonly-cell", render: (row) => row.fromPort },
    { key: "wharf", header: "Wharf", width: "82px", className: "readonly-cell", render: (row) => row.wharf },
    { key: "to", header: "To", width: "78px", className: "readonly-cell", render: (row) => row.toPort },
    { key: "bound", header: "Bound", width: "62px", className: "readonly-cell", render: (row) => row.bound },
    { key: "etaDate", header: "ETA Date", width: "96px", className: "auto-cell", render: (row) => formatDate(row.etaIso) },
    { key: "etaTime", header: "ETA Time", width: "76px", className: "auto-cell", render: (row) => formatTime(row.etaIso) },
    { key: "etbDate", header: "ETB Date", width: "96px", className: "auto-cell", render: (row) => formatDate(row.etbIso) },
    { key: "etbTime", header: "ETB Time", width: "76px", className: "auto-cell", render: (row) => formatTime(row.etbIso) },
    { key: "etdDate", header: "ETD Date", width: "96px", className: "auto-cell", render: (row) => formatDate(row.etdIso) },
    { key: "etdTime", header: "ETD Time", width: "76px", className: "auto-cell", render: (row) => formatTime(row.etdIso) },
    { key: "distance", header: "Distance", width: "84px", align: "right", className: "readonly-cell", render: (row) => row.distanceNm?.toLocaleString() ?? "" },
    { key: "speed", header: "Speed", width: "70px", align: "right", className: "readonly-cell", render: (row) => row.speed.toFixed(1) },
    { key: "sea", header: "Sea Time", width: "86px", align: "right", className: "readonly-cell", render: (row) => formatDuration(row.seaTimeHours) },
    { key: "buffer", header: "Buffer", width: "82px", align: "right", className: "readonly-cell", render: (row) => formatDuration(row.bufferHours) },
    { key: "total", header: "Total Time", width: "92px", align: "right", className: "readonly-cell", render: (row) => formatDuration(row.totalTimeHours) },
    { key: "group", header: "Group No", width: "80px", className: "readonly-cell", render: (row) => row.groupNo },
    { key: "remark", header: "Remark", width: "180px", className: "readonly-cell", render: (row) => row.remark },
  ];

  return (
    <div>
      <Panel
        title="Generate Long Term Schedule"
        actions={
          <div className="flex gap-2">
            <button className="action-button" type="button" onClick={generate} disabled={!selectedProforma}>
              <RotateCw size={15} /> Generate
            </button>
            <button className="action-button" type="button" onClick={clear}>
              <RotateCcw size={15} /> Clear
            </button>
            <button className="primary-button" type="button" onClick={save} disabled={!schedule}>
              <Save size={15} /> Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-[1fr_260px] gap-3">
          <div className="grid grid-cols-6 gap-2">
            <label>
              <div className="field-label">Service Code</div>
              <ServiceCodeInput
                id="longterm-service-code"
                services={appContext.masterData.services}
                value={serviceCode}
                onChange={selectServiceCode}
              />
            </label>
            <label className="col-span-2">
              <div className="field-label">Service Name</div>
              <input className="field-input readonly-cell" value={serviceName} readOnly />
            </label>
            <label>
              <div className="field-label">Proforma Version</div>
              <select className="field-input" value={proformaId} onChange={(e) => setProformaId(e.target.value)}>
                <option value="">Select</option>
                {filteredProformas.map((item) => (
                  <option key={item.header.id} value={item.header.id}>
                    {item.header.versionName || "V1"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="field-label">Vessel</div>
              <select className="field-input" value={vesselCode} onChange={(e) => selectVessel(e.target.value)}>
                {appContext.masterData.vessels.map((item) => (
                  <option key={item.id} value={item.vesselCode}>
                    {item.vesselCode}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2">
              <div className="field-label">Vessel Name</div>
              <input className="field-input" value={vesselName} onChange={(e) => setVesselName(e.target.value)} />
            </label>
            <label>
              <div className="field-label">Voyage From</div>
              <input className="field-input" value={voyageFrom} onChange={(e) => setVoyageFrom(e.target.value)} />
            </label>
            <label>
              <div className="field-label">Voyage To</div>
              <input className="field-input" value={voyageTo} onChange={(e) => setVoyageTo(e.target.value)} />
            </label>
            <label>
              <div className="field-label">First ETA Date</div>
              <input className="field-input" type="date" value={formatDate(firstEtaIso)} onChange={(e) => setFirstEtaIso(setIsoDate(firstEtaIso, e.target.value))} />
            </label>
            <label>
              <div className="field-label">First ETA Time</div>
              <input className="field-input" type="time" value={formatTime(firstEtaIso)} onChange={(e) => setFirstEtaIso(setIsoTime(firstEtaIso, e.target.value))} />
            </label>
            <div className="col-span-4 pt-[18px] text-sm text-slate-600">
              Proforma rows are copied as read-only data. Dates are generated from first ETA and cycle days.
            </div>
          </div>
          <MiniCalendar
            monthIso={calendarMonthIso}
            selectedIso={firstEtaIso}
            highlightedWeekday={highlightedWeekday}
            onMonthChange={setCalendarMonthIso}
            onSelectDate={(dateText) => setFirstEtaIso(setIsoDate(firstEtaIso, dateText))}
          />
        </div>
      </Panel>
      <EditableGrid columns={columns} rows={schedule?.rows ?? []} getRowKey={(row) => row.id} />
    </div>
  );
}
