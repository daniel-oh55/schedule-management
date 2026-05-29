import { ChangeEvent, useState } from "react";
import { Download, Save, Upload } from "lucide-react";
import type { AppContext } from "../App";
import { EditableGrid, type GridColumn } from "../components/EditableGrid";
import { Panel } from "../components/Panel";
import { storageRepository } from "../repositories/storageRepository";
import type { DistanceRecord, MasterDataSet, PortMaster, VesselMaster } from "../types/master";
import { parseDistanceFile } from "../utils/excelDistanceParser";
import { downloadJson, readJsonFile } from "../utils/jsonTransfer";

interface MasterDataPageProps {
  appContext: AppContext;
}

export function MasterDataPage({ appContext }: MasterDataPageProps) {
  const [masterData, setMasterData] = useState<MasterDataSet>(appContext.masterData);
  const [message, setMessage] = useState("");

  function save() {
    storageRepository.saveMasterData(masterData);
    appContext.refresh();
    setMessage("Master data saved to localStorage.");
  }

  async function handleDistanceUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const distances = await parseDistanceFile(file);
    setMasterData((current) => ({ ...current, distances }));
    setMessage(`${distances.length.toLocaleString()} distance records parsed from ${file.name}.`);
    event.target.value = "";
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMasterData(await readJsonFile<MasterDataSet>(file));
    event.target.value = "";
  }

  function updatePort(id: string, patch: Partial<PortMaster>) {
    setMasterData((current) => ({
      ...current,
      ports: current.ports.map((port) => (port.id === id ? { ...port, ...patch } : port)),
    }));
  }

  function updateVessel(id: string, patch: Partial<VesselMaster>) {
    setMasterData((current) => ({
      ...current,
      vessels: current.vessels.map((vessel) => (vessel.id === id ? { ...vessel, ...patch } : vessel)),
    }));
  }

  const portColumns: GridColumn<PortMaster>[] = [
    { key: "code", header: "Port Code", width: "90px", render: (row) => <input className="grid-cell-input" value={row.portCode} onChange={(e) => updatePort(row.id, { portCode: e.target.value.toUpperCase() })} /> },
    { key: "name", header: "Port Name", width: "160px", render: (row) => <input className="grid-cell-input" value={row.portName} onChange={(e) => updatePort(row.id, { portName: e.target.value })} /> },
    { key: "country", header: "Country", width: "80px", render: (row) => <input className="grid-cell-input" value={row.country} onChange={(e) => updatePort(row.id, { country: e.target.value.toUpperCase() })} /> },
    { key: "wharf", header: "Default Wharf", width: "120px", render: (row) => <input className="grid-cell-input" value={row.defaultWharf} onChange={(e) => updatePort(row.id, { defaultWharf: e.target.value.toUpperCase() })} /> },
    { key: "arr", header: "Default Arrival Manv", width: "150px", render: (row) => <input className="grid-cell-input text-right" type="number" step="0.5" value={row.defaultArrivalManvHours} onChange={(e) => updatePort(row.id, { defaultArrivalManvHours: Number(e.target.value) })} /> },
    { key: "dep", header: "Default Departure Manv", width: "170px", render: (row) => <input className="grid-cell-input text-right" type="number" step="0.5" value={row.defaultDepartureManvHours} onChange={(e) => updatePort(row.id, { defaultDepartureManvHours: Number(e.target.value) })} /> },
    { key: "tml", header: "Default Terminal", width: "130px", render: (row) => <input className="grid-cell-input text-right" type="number" step="0.5" value={row.defaultTerminalHours} onChange={(e) => updatePort(row.id, { defaultTerminalHours: Number(e.target.value) })} /> },
  ];

  const vesselColumns: GridColumn<VesselMaster>[] = [
    { key: "code", header: "Vessel Code", width: "110px", render: (row) => <input className="grid-cell-input" value={row.vesselCode} onChange={(e) => updateVessel(row.id, { vesselCode: e.target.value.toUpperCase() })} /> },
    { key: "name", header: "Vessel Name", width: "220px", render: (row) => <input className="grid-cell-input" value={row.vesselName} onChange={(e) => updateVessel(row.id, { vesselName: e.target.value.toUpperCase() })} /> },
  ];

  const distanceColumns: GridColumn<DistanceRecord>[] = [
    { key: "from", header: "From Port", width: "110px", render: (row) => row.fromPort },
    { key: "to", header: "To Port", width: "110px", render: (row) => row.toPort },
    { key: "dist", header: "Distance NM", width: "120px", align: "right", render: (row) => row.distanceNm.toLocaleString() },
  ];

  return (
    <div>
      <Panel
        title="Master Data"
        actions={
          <div className="flex items-center gap-2">
            <button className="action-button" type="button" onClick={() => downloadJson("schedule-master-data.json", masterData)}>
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
        <div className="flex items-center gap-3">
          <label className="action-button cursor-pointer">
            <Upload size={15} /> Import Distance Matrix XLSX/XLS
            <input className="hidden" type="file" accept=".xlsx,.xls" onChange={handleDistanceUpload} />
          </label>
          <div className="text-sm text-slate-600">{message || "Distance matrix parser reads the first sheet and converts numeric matrix cells into From-To records."}</div>
        </div>
      </Panel>

      <div className="grid grid-cols-[1fr_360px] gap-3">
        <Panel title="Port Master">
          <EditableGrid columns={portColumns} rows={masterData.ports} getRowKey={(row) => row.id} maxHeight="300px" />
        </Panel>
        <Panel title="Vessel Master">
          <EditableGrid columns={vesselColumns} rows={masterData.vessels} getRowKey={(row) => row.id} maxHeight="300px" />
        </Panel>
      </div>

      <Panel title={`Distance Table (${masterData.distances.length.toLocaleString()} records)`}>
        <EditableGrid columns={distanceColumns} rows={masterData.distances.slice(0, 500)} getRowKey={(row) => row.id} maxHeight="360px" />
      </Panel>
    </div>
  );
}
