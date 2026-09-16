"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Factory,
  LayoutDashboard,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EquipmentForm } from "@/components/equipment-form";
import { PredictionForm } from "@/components/prediction-form";
import {
  getEquipment,
  getPredictionHistory,
  type Equipment,
  type PredictionHistoryItem,
} from "@/lib/api";

const PAGE_SIZE = 6;
const date = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [view, setView] = useState("overview");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = equipment.find((item) => item.id === selectedId);
  const history = historyState.id === selectedId ? historyState.data : [];
  const historyError =
    historyState.id === selectedId ? historyState.error : null;
  const waiting =
    historyLoading || (selectedId !== null && historyState.id !== selectedId);
  const latest = history[0];

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
        if (active)
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
        if (active)
          setHistoryState({ id: selectedId, data: [], error: error.message });
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, historyRefresh]);

  function selectAsset(id: number) {
    setSelectedId(id);
    setHistoryPage(0);
  }
  function refreshData() {
    setLoading(true);
    setRefresh((n) => n + 1);
    if (selectedId !== null) setHistoryLoading(true);
    setHistoryRefresh((n) => n + 1);
  }
  const filtered = equipment
    .filter(
      (item) =>
        `${item.asset_tag} ${item.machine_type} ${item.location ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (status === "all" || item.is_active === (status === "active")),
    )
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        a.asset_tag.localeCompare(b.asset_tag, undefined, { numeric: true }),
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
  const historyCurrentPage = Math.min(
    historyPage,
    Math.max(0, Math.ceil(history.length / PAGE_SIZE) - 1),
  );
  function exportHistory() {
    const rows = [
      [
        "Asset",
        "Recorded",
        "Failure probability",
        "Risk",
        "Threshold",
        "Air temperature (K)",
        "Process temperature (K)",
        "Speed (rpm)",
        "Torque (Nm)",
        "Tool wear (min)",
      ],
      ...history.map((p) => [
        selected?.asset_tag ?? "",
        p.recorded_at,
        p.failure_probability,
        p.risk,
        p.threshold,
        p.air_temperature_k,
        p.process_temperature_k,
        p.rotational_speed_rpm,
        p.torque_nm,
        p.tool_wear_min,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `sentinel-assessments-${selectedId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-symbol">
            <Activity size={23} />
          </span>
          Sentinel<span className="brand-ai">AI</span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">
            <Factory size={18} />
          </span>
          <div>
            Industrial operations<small>Maintenance workspace</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "equipment", label: "Equipment", icon: Box },
            { id: "assessments", label: "Assessments", icon: Activity },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              {label}
              {id === "equipment" && (
                <span className="nav-count">{equipment.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-note">
            <ShieldCheck size={21} />
            <strong>Built for informed decisions</strong>
            <p>Prediction signals to support your engineering judgment.</p>
          </div>
          <div className="workspace-footer">
            <span className="avatar">OP</span>
            <div>
              Operations workspace<small>SentinelAI · v0.1</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <ChevronRight size={14} />
            <span>
              {view === "overview"
                ? "Overview"
                : view === "equipment"
                  ? "Equipment"
                  : "Assessments"}
            </span>
          </div>
          <span
            className={`connection ${loading ? "pending" : equipmentError ? "offline" : ""}`}
          >
            <i />
            {loading
              ? "Connecting"
              : equipmentError
                ? "Connection unavailable"
                : "API connected"}
          </span>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">MAINTENANCE INTELLIGENCE</p>
              <h1>
                {view === "overview"
                  ? "Operations overview"
                  : view === "equipment"
                    ? "Equipment registry"
                    : "Asset assessments"}
              </h1>
              <p>
                {view === "equipment"
                  ? "Find, register, and select the equipment you monitor."
                  : "Know your equipment. Make the next decision with confidence."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary icon-button"
                aria-label="Refresh data"
                onClick={refreshData}
                disabled={loading || waiting}
              >
                <RefreshCw size={17} className={loading ? "spinning" : ""} />
              </button>
              <button
                className="button primary"
                onClick={() => dialog.current?.showModal()}
              >
                <Plus size={17} />
                Register equipment
              </button>
            </div>
          </div>
          {notice && (
            <div className="notice" role="status">
              <ShieldCheck size={17} />
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {equipmentError && (
            <div className="error-banner" role="alert">
              <div>
                <strong>Equipment could not be refreshed</strong>
                <p>
                  {equipmentError}{" "}
                  {equipment.length > 0
                    ? "Previously loaded equipment is shown."
                    : "Check your API connection and try again."}
                </p>
              </div>
              <button
                className="button secondary"
                onClick={refreshData}
                disabled={loading}
              >
                Try again
              </button>
            </div>
          )}
          {view === "overview" && (
            <section className="stats" aria-label="Equipment summary">
              <article className="stat">
                <div className="stat-label">
                  Registered equipment
                  <Box size={17} />
                </div>
                <div className="stat-value">
                  {loading
                    ? "—"
                    : equipmentError && !equipment.length
                      ? "—"
                      : equipment.length.toString().padStart(2, "0")}
                </div>
                <p>Assets in your workspace</p>
              </article>
              <article className="stat">
                <div className="stat-label">
                  Active equipment
                  <Factory size={17} />
                </div>
                <div className="stat-value">
                  {loading || (equipmentError && !equipment.length)
                    ? "—"
                    : equipment
                        .filter((e) => e.is_active)
                        .length.toString()
                        .padStart(2, "0")}
                  <span className="stat-unit">registered as active</span>
                </div>
                <p>Registration status, independent of risk</p>
              </article>
              <article className="stat">
                <div className="stat-label">
                  Saved assessments
                  <Activity size={17} />
                </div>
                <div className="stat-value">
                  {waiting || historyError
                    ? "—"
                    : history.length.toString().padStart(2, "0")}
                </div>
                <p>
                  {selected
                    ? `For ${selected.asset_tag}`
                    : "Select equipment to get started"}
                </p>
              </article>
              <article className="stat">
                <div className="stat-label">
                  Latest risk signal
                  <ShieldCheck size={17} />
                </div>
                <div
                  className={`stat-value risk-value ${!waiting && latest?.risk === "HIGH" ? "text-danger" : ""}`}
                >
                  {waiting
                    ? "Loading"
                    : latest
                      ? latest.risk === "HIGH"
                        ? "High risk"
                        : "Low risk"
                      : historyError
                        ? "Unavailable"
                        : "Not assessed"}
                </div>
                <p>
                  {!waiting && latest
                    ? `${(latest.failure_probability * 100).toFixed(2)}% failure probability · ${selected?.asset_tag}`
                    : historyError
                      ? "Refresh to retry loading this asset"
                      : "Run an assessment for a risk signal"}
                </p>
              </article>
            </section>
          )}
          {view !== "assessments" && (
            <section className="panel equipment-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Equipment registry{" "}
                    <span className="count">{equipment.length}</span>
                  </h2>
                  <p>
                    Select an asset to inspect its readings and risk history.
                  </p>
                </div>
                <span className="section-kicker">ASSET DIRECTORY</span>
              </div>
              <div className="table-toolbar">
                <label className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search equipment"
                    placeholder="Search assets, types, or locations…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                  />
                  {query && (
                    <button
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        setPage(0);
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>
                <label className="filter">
                  <SlidersHorizontal size={15} />
                  <select
                    aria-label="Filter equipment status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th aria-sort={ascending ? "ascending" : "descending"}>
                        <button
                          className="sort-button"
                          onClick={() => setAscending(!ascending)}
                        >
                          Asset name{" "}
                          <ArrowDown
                            size={13}
                            style={{
                              transform: ascending
                                ? undefined
                                : "rotate(180deg)",
                            }}
                          />
                        </button>
                      </th>
                      <th>Machine type</th>
                      <th>Location</th>
                      <th>Registration status</th>
                      <th>
                        <span className="sr-only">Selection</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading &&
                      filtered
                        .slice(
                          currentPage * PAGE_SIZE,
                          (currentPage + 1) * PAGE_SIZE,
                        )
                        .map((item) => (
                          <tr
                            key={item.id}
                            className={
                              selectedId === item.id ? "selected-row" : ""
                            }
                          >
                            <td>
                              <button
                                className="asset-button"
                                aria-pressed={selectedId === item.id}
                                onClick={() => selectAsset(item.id)}
                              >
                                <span className="asset-icon">
                                  <Factory size={18} />
                                </span>
                                <span>
                                  {item.asset_tag}
                                  <small>
                                    Asset #{String(item.id).padStart(4, "0")}
                                  </small>
                                </span>
                              </button>
                            </td>
                            <td>{item.machine_type}</td>
                            <td>
                              <span className="location">
                                <MapPin size={14} />
                                {item.location || "Not specified"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${item.is_active ? "positive" : "neutral"}`}
                              >
                                <i />
                                {item.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <button
                                className={`row-action ${selectedId === item.id ? "chosen" : ""}`}
                                aria-label={`Select ${item.asset_tag}`}
                                onClick={() => selectAsset(item.id)}
                              >
                                {selectedId === item.id
                                  ? "Selected"
                                  : "Inspect"}
                                <ArrowRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    {(loading || filtered.length === 0) && (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-state">
                            <Box size={27} />
                            <strong>
                              {loading
                                ? "Loading equipment…"
                                : equipmentError && !equipment.length
                                  ? "Your equipment is unavailable"
                                  : equipment.length
                                    ? "No matching equipment"
                                    : "Your first asset starts here"}
                            </strong>
                            <p>
                              {loading
                                ? "Connecting to your maintenance workspace."
                                : equipment.length
                                  ? "Try another search or change the status filter."
                                  : "Register equipment, then add a sensor reading to assess its risk."}
                            </p>
                            {!loading &&
                              !equipmentError &&
                              !equipment.length && (
                                <button
                                  className="button secondary"
                                  onClick={() => dialog.current?.showModal()}
                                >
                                  <Plus size={16} />
                                  Register equipment
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>
                  {filtered.length
                    ? `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} assets`
                    : "0 assets"}
                </span>
                <div className="pagination">
                  <button
                    aria-label="Previous equipment page"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    Page {currentPage + 1} of{" "}
                    {Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}
                  </span>
                  <button
                    aria-label="Next equipment page"
                    disabled={(currentPage + 1) * PAGE_SIZE >= filtered.length}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {view !== "equipment" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ASSET WORKSPACE</p>
                  <h2>
                    {selected?.asset_tag ?? "Equipment assessment"}
                    <span className="heading-detail">
                      {selected?.machine_type}
                    </span>
                  </h2>
                </div>
                <label className="asset-select">
                  Selected equipment
                  <select
                    aria-label="Selected equipment"
                    value={selectedId ?? ""}
                    disabled={!equipment.length}
                    onChange={(e) => selectAsset(Number(e.target.value))}
                  >
                    {!equipment.length && (
                      <option value="">No equipment available</option>
                    )}
                    {equipment.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.asset_tag}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="assessment-grid">
                <PredictionForm
                  key={selectedId ?? "none"}
                  equipmentId={selectedId}
                  onPredictionCreated={() => {
                    setHistoryLoading(true);
                    setHistoryRefresh((n) => n + 1);
                    setHistoryPage(0);
                  }}
                />
                <section className="panel signal-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Latest assessment</h2>
                      <p>A snapshot of the selected asset.</p>
                    </div>
                    <Activity size={18} />
                  </div>
                  {waiting ? (
                    <div className="empty-state">
                      <RefreshCw className="spinning" size={24} />
                      <strong>Loading assessment…</strong>
                    </div>
                  ) : historyError ? (
                    <div className="empty-state">
                      <strong>Assessment unavailable</strong>
                      <p>{historyError}</p>
                      <button
                        className="button secondary"
                        onClick={refreshData}
                      >
                        Try again
                      </button>
                    </div>
                  ) : latest ? (
                    <div className="signal-content">
                      <span
                        className={`badge ${latest.risk === "HIGH" ? "danger" : "positive"}`}
                      >
                        <i />
                        {latest.risk === "HIGH"
                          ? "Review recommended"
                          : "Low risk signal"}
                      </span>
                      <div className="probability">
                        {(latest.failure_probability * 100).toFixed(2)}
                        <span>%</span>
                      </div>
                      <p className="muted">Predicted failure probability</p>
                      <div className="probability-track">
                        <div
                          className={latest.risk === "HIGH" ? "high" : "low"}
                          style={{
                            width: `${latest.failure_probability * 100}%`,
                          }}
                        />
                        <span style={{ left: `${latest.threshold * 100}%` }} />
                      </div>
                      <div className="scale">
                        <span>0%</span>
                        <span>
                          Threshold {(latest.threshold * 100).toFixed(1)}%
                        </span>
                        <span>100%</span>
                      </div>
                      <dl className="signal-details">
                        <div>
                          <dt>Recorded</dt>
                          <dd>{date(latest.recorded_at)}</dd>
                        </div>
                        <div>
                          <dt>Model</dt>
                          <dd>{latest.model_name}</dd>
                        </div>
                      </dl>
                      <p className="signal-note">
                        <CircleHelp size={16} />A low risk signal does not rule
                        out failure. Review alongside inspection findings.
                      </p>
                    </div>
                  ) : (
                    <div className="empty-state signal-empty">
                      <Activity size={30} />
                      <strong>No assessment yet</strong>
                      <p>
                        Enter a sensor reading to see this asset’s failure
                        probability and risk signal.
                      </p>
                    </div>
                  )}
                </section>
              </div>
              <section className="panel history-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Assessment history{" "}
                      <span className="count">
                        {waiting ? "—" : history.length}
                      </span>
                    </h2>
                    <p>
                      Saved sensor readings and model results
                      {selected ? ` for ${selected.asset_tag}` : ""}.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={!history.length || waiting || !!historyError}
                    onClick={exportHistory}
                  >
                    <Download size={15} />
                    Export CSV
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Recorded</th>
                        <th>Failure probability</th>
                        <th>Risk signal</th>
                        <th>Speed</th>
                        <th>Torque</th>
                        <th>Tool wear</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!waiting &&
                        history
                          .slice(
                            historyCurrentPage * PAGE_SIZE,
                            (historyCurrentPage + 1) * PAGE_SIZE,
                          )
                          .map((p) => (
                            <tr key={p.prediction_id}>
                              <td className="numeric">{date(p.recorded_at)}</td>
                              <td>
                                <div className="probability-cell">
                                  <span className="numeric">
                                    {(p.failure_probability * 100).toFixed(2)}%
                                  </span>
                                  <span className="mini-track">
                                    <i
                                      className={
                                        p.risk === "HIGH" ? "high" : "low"
                                      }
                                      style={{
                                        width: `${p.failure_probability * 100}%`,
                                      }}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`badge ${p.risk === "HIGH" ? "danger" : "positive"}`}
                                >
                                  <i />
                                  {p.risk === "HIGH" ? "High risk" : "Low risk"}
                                </span>
                              </td>
                              <td className="numeric">
                                {p.rotational_speed_rpm.toLocaleString()}{" "}
                                <span className="muted">rpm</span>
                              </td>
                              <td className="numeric">
                                {p.torque_nm} <span className="muted">Nm</span>
                              </td>
                              <td className="numeric">
                                {p.tool_wear_min}{" "}
                                <span className="muted">min</span>
                              </td>
                            </tr>
                          ))}
                      {(waiting || !history.length) && (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty-state compact">
                              <strong>
                                {waiting
                                  ? "Loading assessment history…"
                                  : historyError
                                    ? "History could not be loaded"
                                    : "No saved assessments"}
                              </strong>
                              <p>
                                {historyError ||
                                  "Completed assessments will appear here with their sensor readings."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>
                    Most recent first ·{" "}
                    {selected?.asset_tag ?? "No asset selected"}
                  </span>
                  <div className="pagination">
                    <button
                      aria-label="Previous history page"
                      disabled={historyCurrentPage === 0}
                      onClick={() => setHistoryPage(historyCurrentPage - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      Page {historyCurrentPage + 1} of{" "}
                      {Math.max(1, Math.ceil(history.length / PAGE_SIZE))}
                    </span>
                    <button
                      aria-label="Next history page"
                      disabled={
                        (historyCurrentPage + 1) * PAGE_SIZE >= history.length
                      }
                      onClick={() => setHistoryPage(historyCurrentPage + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={15} />
              Decision support for qualified engineers. Assessments do not
              replace inspection.
            </span>
            <span>SENTINELAI / OPERATIONS</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="registration-dialog"
        aria-labelledby="register-title"
      >
        <div className="dialog-heading">
          <span className="eyebrow">ASSET REGISTRY</span>
          <button
            className="icon-button"
            aria-label="Close registration"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <EquipmentForm
          onEquipmentCreated={(item) => {
            setEquipment((items) => [...items, item]);
            selectAsset(item.id);
            setNotice(
              `${item.asset_tag} registered. You can now run its first assessment.`,
            );
            dialog.current?.close();
          }}
        />
      </dialog>
    </div>
  );
}
