"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { AppSidebar, type DashboardView } from "@/components/app-sidebar";
import { AssessmentWorkspace } from "@/components/assessment-workspace";
import { DashboardHeader } from "@/components/dashboard-header";
import { EquipmentForm } from "@/components/equipment-form";
import { EquipmentRegistry } from "@/components/equipment-registry";
import { EquipmentSummary } from "@/components/equipment-summary";
import {
  getEquipment,
  getPredictionHistory,
  type Equipment,
  type PredictionHistoryItem,
} from "@/lib/api";

export default function Home() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [historyState, setHistoryState] = useState<{
    id: number | null;
    data: PredictionHistoryItem[];
    error: string | null;
  }>({ id: null, data: [], error: null });
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [view, setView] = useState<DashboardView>("overview");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const selected = equipment.find((item) => item.id === selectedId);
  const history = historyState.id === selectedId ? historyState.data : [];
  const historyError = historyState.id === selectedId ? historyState.error : null;
  const waiting = historyLoading || (selectedId !== null && historyState.id !== selectedId);

  useEffect(() => {
    let active = true;
    getEquipment()
      .then((data) => {
        if (!active) return;
        setEquipment(data);
        setEquipmentError(null);
        setSelectedId((id) =>
          data.some((item) => item.id === id) ? id : (data[0]?.id ?? null),
        );
      })
      .catch((error: Error) => {
        if (active) setEquipmentError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    getPredictionHistory(selectedId)
      .then((data) => {
        if (!active) return;
        setHistoryState({
          id: selectedId,
          data: [...data].sort(
            (a, b) =>
              Date.parse(b.recorded_at) - Date.parse(a.recorded_at) ||
              b.prediction_id - a.prediction_id,
          ),
          error: null,
        });
      })
      .catch((error: Error) => {
        if (active) {
          setHistoryState({ id: selectedId, data: [], error: error.message });
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [historyRefresh, selectedId]);

  function selectAsset(id: number) {
    setHistoryLoading(true);
    setSelectedId(id);
  }

  function refreshData() {
    setLoading(true);
    setRefresh((value) => value + 1);
    if (selectedId !== null) setHistoryLoading(true);
    setHistoryRefresh((value) => value + 1);
  }

  function refreshHistory() {
    setHistoryLoading(true);
    setHistoryRefresh((value) => value + 1);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <AppSidebar activeView={view} equipmentCount={equipment.length} onViewChange={setView} />
      <div className="main-shell">
        <DashboardHeader
          loading={loading}
          hasError={Boolean(equipmentError)}
          refreshDisabled={loading || waiting}
          onRefresh={refreshData}
          onRegister={() => dialog.current?.showModal()}
        />
        <main id="main" className="main-content">
          {notice && (
            <div className="notice" role="status">
              <ShieldCheck size={17} />
              {notice}
              <button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {equipmentError && (
            <div className="error-banner" role="alert">
              <div>
                <strong>Equipment could not be refreshed</strong>
                <p>{equipmentError} {equipment.length ? "Previously loaded equipment is shown." : "Check your API connection and try again."}</p>
              </div>
              <button className="button secondary" onClick={refreshData} disabled={loading}>Try again</button>
            </div>
          )}
          {view === "overview" && (
            <EquipmentSummary
              equipment={equipment}
              selected={selected}
              history={history}
              latest={history[0]}
              loading={loading}
              waiting={waiting}
              hasEquipmentError={Boolean(equipmentError)}
              historyError={historyError}
            />
          )}
          {view !== "assessments" && (
            <EquipmentRegistry
              equipment={equipment}
              selectedId={selectedId}
              loading={loading}
              error={equipmentError}
              onSelect={selectAsset}
              onRegister={() => dialog.current?.showModal()}
            />
          )}
          {view !== "equipment" && (
            <AssessmentWorkspace
              equipment={equipment}
              selected={selected}
              selectedId={selectedId}
              history={history}
              waiting={waiting}
              error={historyError}
              onSelect={selectAsset}
              onRefresh={refreshData}
              onPredictionCreated={refreshHistory}
            />
          )}
          <footer className="page-footer">
            <span><ShieldCheck size={15} />Decision support for qualified engineers. Assessments do not replace inspection.</span>
          </footer>
        </main>
      </div>
      <dialog ref={dialog} className="registration-dialog" aria-labelledby="register-title">
        <div className="dialog-heading">
          <button className="icon-button" aria-label="Close registration" onClick={() => dialog.current?.close()}>
            <X size={20} />
          </button>
        </div>
        <EquipmentForm
          onEquipmentCreated={(item) => {
            setEquipment((items) => [...items, item]);
            selectAsset(item.id);
            setNotice(`${item.asset_tag} registered. You can now run its first assessment.`);
            dialog.current?.close();
          }}
        />
      </dialog>
    </div>
  );
}
