import { useMemo, useState } from "react";
import { RotateCw, Save } from "lucide-react";
import type { AppContext } from "../App";
import { EditableGrid, type GridColumn } from "../components/EditableGrid";
import { Panel } from "../components/Panel";
import { ServiceCodeInput } from "../components/ServiceCodeInput";
import { VesselCodeInput } from "../components/VesselCodeInput";
import { storageRepository } from "../repositories/storageRepository";
import type { CoastalRow, CoastalSchedule } from "../types/schedule";
import { createCoastalFromLongTerm, recalculateCoastalRows } from "../utils/coastalCalculator";
import { findService } from "../utils/service";
import { findVessel } from "../utils/vessel";
import { formatDate, formatDelay, formatDuration, formatTime, setIsoDate, setIsoTime } from "../utils/time";

interface CoastalSchedulePageProps {
  appContext: AppContext;
}

export function CoastalSchedulePage({ appContext }: CoastalSchedulePageProps) {
  const [serviceCode, setServiceCode] = useState(appContext.longTerms[0]?.serviceCode ?? "");
  const [vesselCode, setVesselCode] = useState(appContext.longTerms[0]?.vesselCode ?? "");
  const [longTermId, setLongTermId] = useState(appContext.longTerms[0]?.id ?? "");
  const filteredLongTerms = useMemo(
    () =>
      appContext.longTerms.filter((item) => {
        const serviceMatch = serviceCode ? item.serviceCode.toUpperCase() === serviceCode.toUpperCase() : true;
        const vesselMatch = vesselCode ? item.vesselCode.toUpperCase() === vesselCode.toUpperCase() : true;
        return serviceMatch && vesselMatch;
      }),
    [appContext.longTerms, serviceCode, vesselCode],
  );
  const selectedLongTerm = useMemo(
    () => appContext.longTerms.find((item) => item.id === longTermId),
    [appContext.longTerms, longTermId],
  );
  const voyages = Array.from(new Set(selectedLongTerm?.rows.map((row) => row.voyage) ?? []));
  const [voyage, setVoyage] = useState(voyages[0] ?? "");
  const [schedule, setSchedule] = useState<CoastalSchedule | null>(null);
  const serviceName = findService(appContext.masterData.services, serviceCode)?.serviceName ?? selectedLongTerm?.serviceCode ?? "";
  const vesselName = findVessel(appContext.masterData.vessels, vesselCode)?.vesselName ?? selectedLongTerm?.vesselName ?? "";

  function selectServiceCode(code: string) {
    const nextCode = code.toUpperCase();
    const nextLongTerm = appContext.longTerms.find(
      (item) =>
        item.serviceCode.toUpperCase() === nextCode &&
        (vesselCode ? item.vesselCode.toUpperCase() === vesselCode.toUpperCase() : true),
    );
    const nextVoyages = Array.from(new Set(nextLongTerm?.rows.map((row) => row.voyage) ?? []));
    setServiceCode(nextCode);
    setLongTermId(nextLongTerm?.id ?? "");
    setVoyage(nextVoyages[0] ?? "");
    setSchedule(null);
  }

  function selectVesselCode(code: string) {
    const nextCode = code.toUpperCase();
    const nextLongTerm = appContext.longTerms.find(
      (item) =>
        item.vesselCode.toUpperCase() === nextCode &&
        (serviceCode ? item.serviceCode.toUpperCase() === serviceCode.toUpperCase() : true),
    );
    const nextVoyages = Array.from(new Set(nextLongTerm?.rows.map((row) => row.voyage) ?? []));
    setVesselCode(nextCode);
    setLongTermId(nextLongTerm?.id ?? "");
    setVoyage(nextVoyages[0] ?? "");
    setSchedule(null);
  }

  function selectLongTerm(id: string) {
    const nextLongTerm = appContext.longTerms.find((item) => item.id === id);
    const nextVoyages = Array.from(new Set(nextLongTerm?.rows.map((row) => row.voyage) ?? []));
    setLongTermId(id);
    setServiceCode(nextLongTerm?.serviceCode ?? serviceCode);
    setVesselCode(nextLongTerm?.vesselCode ?? vesselCode);
    setVoyage(nextVoyages[0] ?? "");
    setSchedule(null);
  }

  function generate() {
    if (!selectedLongTerm || !voyage) return;
    setSchedule(createCoastalFromLongTerm(selectedLongTerm, voyage));
  }

  function save() {
    if (!schedule) return;
    storageRepository.saveCoastal(schedule);
    appContext.refresh();
  }

  function updateRow(id: string, patch: Partial<CoastalRow>) {
    setSchedule((current) => {
      if (!current) return current;
      const rows = current.rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return { ...current, rows: recalculateCoastalRows(rows, appContext.masterData.distances) };
    });
  }

  const columns: GridColumn<CoastalRow>[] = [
    { key: "seq", header: "Seq", width: "48px", align: "center", className: "readonly-cell", render: (row) => row.seq },
    { key: "service", header: "Service", width: "76px", className: "readonly-cell", render: (row) => row.serviceCode },
    { key: "vessel", header: "Vessel", width: "82px", className: "readonly-cell", render: (row) => row.vesselCode },
    { key: "voyage", header: "Voyage", width: "72px", className: "readonly-cell", render: (row) => row.voyage },
    { key: "from", header: "From", width: "78px", render: (row) => <input className="grid-cell-input" value={row.fromPort} onChange={(e) => updateRow(row.id, { fromPort: e.target.value.toUpperCase() })} /> },
    { key: "wharf", header: "Wharf", width: "82px", render: (row) => <input className="grid-cell-input" value={row.wharf} onChange={(e) => updateRow(row.id, { wharf: e.target.value.toUpperCase() })} /> },
    { key: "to", header: "To", width: "78px", render: (row) => <input className="grid-cell-input" value={row.toPort} onChange={(e) => updateRow(row.id, { toPort: e.target.value.toUpperCase() })} /> },
    { key: "ltEta", header: "Long Term ETA", width: "132px", className: "readonly-cell", render: (row) => `${formatDate(row.longTermEtaIso)} ${formatTime(row.longTermEtaIso)}` },
    {
      key: "coEta",
      header: "Coastal ETA",
      width: "152px",
      render: (row) => (
        <div className="flex gap-1">
          <input className="grid-cell-input w-[94px]" type="date" value={formatDate(row.coastalEtaIso)} onChange={(e) => updateRow(row.id, { coastalEtaIso: setIsoDate(row.coastalEtaIso, e.target.value) })} />
          <input className="grid-cell-input w-[58px]" type="time" value={formatTime(row.coastalEtaIso)} onChange={(e) => updateRow(row.id, { coastalEtaIso: setIsoTime(row.coastalEtaIso, e.target.value) })} />
        </div>
      ),
    },
    { key: "ltEtd", header: "Long Term ETD", width: "132px", className: "readonly-cell", render: (row) => `${formatDate(row.longTermEtdIso)} ${formatTime(row.longTermEtdIso)}` },
    {
      key: "coEtd",
      header: "Coastal ETD",
      width: "152px",
      render: (row) => (
        <div className="flex gap-1">
          <input className="grid-cell-input w-[94px]" type="date" value={formatDate(row.coastalEtdIso)} onChange={(e) => updateRow(row.id, { coastalEtdIso: setIsoDate(row.coastalEtdIso, e.target.value) })} />
          <input className="grid-cell-input w-[58px]" type="time" value={formatTime(row.coastalEtdIso)} onChange={(e) => updateRow(row.id, { coastalEtdIso: setIsoTime(row.coastalEtdIso, e.target.value) })} />
        </div>
      ),
    },
    { key: "delay", header: "Delay", width: "86px", className: "auto-cell", render: (row) => formatDelay(row.delayHours) },
    { key: "distance", header: "Distance", width: "82px", align: "right", className: "auto-cell", render: (row) => row.distanceNm?.toLocaleString() ?? "" },
    { key: "speed", header: "Speed", width: "72px", align: "right", render: (row) => <input className="grid-cell-input text-right" type="number" step="0.1" value={row.speed} onChange={(e) => updateRow(row.id, { speed: Number(e.target.value) })} /> },
    { key: "sea", header: "Sea Time", width: "88px", className: "auto-cell", render: (row) => formatDuration(row.seaTimeHours) },
    { key: "buffer", header: "Buffer", width: "82px", className: "readonly-cell", render: (row) => formatDuration(row.bufferHours) },
    { key: "remark", header: "Remark", width: "180px", render: (row) => <input className="grid-cell-input" value={row.remark} onChange={(e) => updateRow(row.id, { remark: e.target.value })} /> },
  ];

  return (
    <div>
      <Panel
        title="Coastal Schedule"
        actions={
          <div className="flex gap-2">
            <button className="action-button" type="button" onClick={generate} disabled={!selectedLongTerm || !voyage}>
              <RotateCw size={15} /> Create from Long Term
            </button>
            <button className="primary-button" type="button" onClick={save} disabled={!schedule}>
              <Save size={15} /> Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-[130px_220px_130px_220px_320px_120px_1fr] gap-2">
          <label>
            <div className="field-label">Service Code</div>
            <ServiceCodeInput
              id="coastal-service-code"
              services={appContext.masterData.services}
              value={serviceCode}
              onChange={selectServiceCode}
            />
          </label>
          <label>
            <div className="field-label">Service Name</div>
            <input className="field-input readonly-cell" value={serviceName} readOnly />
          </label>
          <label>
            <div className="field-label">Vessel Code</div>
            <VesselCodeInput
              id="coastal-vessel-code"
              vessels={appContext.masterData.vessels}
              value={vesselCode}
              onChange={selectVesselCode}
            />
          </label>
          <label>
            <div className="field-label">Vessel Name</div>
            <input className="field-input readonly-cell" value={vesselName} readOnly />
          </label>
          <label>
            <div className="field-label">Long Term Schedule</div>
            <select className="field-input" value={longTermId} onChange={(e) => selectLongTerm(e.target.value)}>
              <option value="">Select</option>
              {filteredLongTerms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.serviceCode} / {item.vesselCode} / {item.voyageFrom}-{item.voyageTo}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="field-label">Voyage</div>
            <select className="field-input" value={voyage} onChange={(e) => setVoyage(e.target.value)}>
              <option value="">Select</option>
              {voyages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="pt-[18px] text-sm text-slate-600">
            Editable voyage copy is separated from Long Term. Row drag and drop is prepared by dependency and will be wired in the next iteration.
          </div>
        </div>
      </Panel>
      <EditableGrid columns={columns} rows={schedule?.rows ?? []} getRowKey={(row) => row.id} />
    </div>
  );
}
