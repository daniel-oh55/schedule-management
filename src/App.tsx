import { useMemo, useState } from "react";
import { Layout } from "./components/Layout";
import { CoastalSchedulePage } from "./pages/CoastalSchedulePage";
import { LongTermSchedulePage } from "./pages/LongTermSchedulePage";
import { MasterDataPage } from "./pages/MasterDataPage";
import { ProformaSchedulePage } from "./pages/ProformaSchedulePage";
import { storageRepository } from "./repositories/storageRepository";

export type AppPage = "proforma" | "longTerm" | "coastal" | "master";

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>("proforma");
  const [version, setVersion] = useState(0);

  const context = useMemo(
    () => ({
      masterData: storageRepository.getMasterData(),
      proformas: storageRepository.listProformas(),
      longTerms: storageRepository.listLongTerms(),
      coastals: storageRepository.listCoastals(),
      refresh: () => setVersion((value) => value + 1),
    }),
    [version],
  );

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === "proforma" && <ProformaSchedulePage appContext={context} />}
      {currentPage === "longTerm" && <LongTermSchedulePage appContext={context} />}
      {currentPage === "coastal" && <CoastalSchedulePage appContext={context} />}
      {currentPage === "master" && <MasterDataPage appContext={context} />}
    </Layout>
  );
}

export type AppContext = ReturnType<typeof storageRepository.getMasterData> extends infer _
  ? {
      masterData: ReturnType<typeof storageRepository.getMasterData>;
      proformas: ReturnType<typeof storageRepository.listProformas>;
      longTerms: ReturnType<typeof storageRepository.listLongTerms>;
      coastals: ReturnType<typeof storageRepository.listCoastals>;
      refresh: () => void;
    }
  : never;
