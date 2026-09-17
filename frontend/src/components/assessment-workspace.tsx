"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  RefreshCw,
} from "lucide-react";
import { PredictionForm } from "@/components/prediction-form";
import type { Equipment, PredictionHistoryItem } from "@/lib/api";

const PAGE_SIZE = 6;

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssessmentWorkspace({
  equipment,
  selected,
  selectedId,
  history,
  waiting,
  error,
  onSelect,
  onRefresh,
  onPredictionCreated,
}: {
  equipment: Equipment[];
  selected: Equipment | undefined;
  selectedId: number | null;
  history: PredictionHistoryItem[];
  waiting: boolean;
  error: string | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
  onPredictionCreated: () => void;
}) {
  const [historyPage, setHistoryPage] = useState(0);
  const latest = history[0];
  const historyCurrentPage = Math.min(
    historyPage,
    Math.max(0, Math.ceil(history.length / PAGE_SIZE) - 1),
  );

  useEffect(() => setHistoryPage(0), [selectedId]);

  function exportHistory() {
    const rows = [
      [
        "Asset",
        "Recorded",
        "Failure probability",
        "Risk",
        "Threshold",
        "Anomaly score",
        "Healthy-baseline signal",
        "Anomaly model",
        "Operating cycle",
        "Predicted RUL (cycles)",
        "Conservative RUL (cycles)",
        "RUL model",
        "RUL data note",
        "Air temperature (K)",
        "Process temperature (K)",
        "Speed (rpm)",
        "Torque (Nm)",
        "Tool wear (min)",
      ],
      ...history.map((item) => [
        selected?.asset_tag ?? "",
        item.recorded_at,
        item.failure_probability,
        item.risk,
        item.threshold,
        item.anomaly_score ?? "",
        item.is_anomaly === null
          ? ""
          : item.is_anomaly
            ? "Unusual reading"
            : "Within learned baseline",
        item.anomaly_model_name ?? "",
        item.operating_cycle ?? "",
        item.predicted_rul_cycles ?? "",
        item.conservative_rul_cycles ?? "",
        item.rul_model_name ?? "",
        item.rul_training_data_note ?? "",
        item.air_temperature_k,
        item.process_temperature_k,
        item.rotational_speed_rpm,
        item.torque_nm,
        item.tool_wear_min,
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
    <>
      <div className="section-heading">
        <h2>
          {selected?.asset_tag ?? "Equipment assessment"}
          <span className="heading-detail">{selected?.machine_type}</span>
        </h2>
        <label className="asset-select">
          Selected equipment
          <select
            aria-label="Selected equipment"
            value={selectedId ?? ""}
            disabled={!equipment.length}
            onChange={(event) => onSelect(Number(event.target.value))}
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
            setHistoryPage(0);
            onPredictionCreated();
          }}
        />
        <section className="panel signal-panel">
          <div className="panel-heading">
            <div>
              <h2>Latest assessment</h2>
              <p>Current model result for the selected asset.</p>
            </div>
            <Activity size={18} />
          </div>
          {waiting ? (
            <div className="empty-state">
              <RefreshCw className="spinning" size={24} />
              <strong>Loading assessment…</strong>
            </div>
          ) : error ? (
            <div className="empty-state">
              <strong>Assessment unavailable</strong>
              <p>{error}</p>
              <button className="button secondary" onClick={onRefresh}>
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
                  style={{ width: `${latest.failure_probability * 100}%` }}
                />
                <span style={{ left: `${latest.threshold * 100}%` }} />
              </div>
              <div className="scale">
                <span>0%</span>
                <span>Threshold {(latest.threshold * 100).toFixed(1)}%</span>
                <span>100%</span>
              </div>
              <dl className="signal-details">
                <div>
                  <dt>Healthy-baseline signal</dt>
                  <dd>
                    {latest.is_anomaly === null
                      ? "Not available for older assessment"
                      : latest.is_anomaly
                        ? "Unusual reading"
                        : "Within learned baseline"}
                  </dd>
                </div>
                <div>
                  <dt>Anomaly score</dt>
                  <dd>
                    {latest.anomaly_score === null
                      ? "—"
                      : latest.anomaly_score.toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt>Predicted remaining life</dt>
                  <dd>
                    {latest.predicted_rul_cycles === null
                      ? "Operating cycle not provided"
                      : `${latest.predicted_rul_cycles.toFixed(0)} cycles`}
                  </dd>
                </div>
                <div>
                  <dt>Conservative planning estimate</dt>
                  <dd>
                    {latest.conservative_rul_cycles === null
                      ? "Not available"
                      : `${latest.conservative_rul_cycles.toFixed(0)} cycles`}
                  </dd>
                </div>
                <div>
                  <dt>RUL data basis</dt>
                  <dd>
                    {latest.rul_training_data_note ?? "Not available"}
                  </dd>
                </div>
                <div>
                  <dt>Recorded</dt>
                  <dd>{formatDate(latest.recorded_at)}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{latest.model_name}</dd>
                </div>
              </dl>
              <p className="signal-note">
                <CircleHelp size={16} />A low risk signal does not rule out
                failure. Review alongside inspection findings.
              </p>
            </div>
          ) : (
            <div className="empty-state signal-empty">
              <Activity size={30} />
              <strong>No assessment yet</strong>
              <p>
                Enter a sensor reading to see this asset’s failure probability
                and risk signal.
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
              <span className="count">{waiting ? "—" : history.length}</span>
            </h2>
            <p>
              Saved sensor readings and model results
              {selected ? ` for ${selected.asset_tag}` : ""}.
            </p>
          </div>
          <button
            className="button secondary"
            disabled={!history.length || waiting || !!error}
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
                <th>Baseline signal</th>
                <th>Planning RUL</th>
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
                  .map((item) => (
                    <tr key={item.prediction_id}>
                      <td className="numeric">
                        {formatDate(item.recorded_at)}
                      </td>
                      <td>
                        <div className="probability-cell">
                          <span className="numeric">
                            {(item.failure_probability * 100).toFixed(2)}%
                          </span>
                          <span className="mini-track">
                            <i
                              className={item.risk === "HIGH" ? "high" : "low"}
                              style={{
                                width: `${item.failure_probability * 100}%`,
                              }}
                            />
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${item.risk === "HIGH" ? "danger" : "positive"}`}
                        >
                          <i />
                          {item.risk === "HIGH" ? "High risk" : "Low risk"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.is_anomaly === null
                              ? ""
                              : item.is_anomaly
                                ? "danger"
                                : "positive"
                          }`}
                        >
                          <i />
                          {item.is_anomaly === null
                            ? "Not available"
                            : item.is_anomaly
                              ? "Unusual"
                              : "Within baseline"}
                        </span>
                      </td>
                      <td className="numeric">
                        {item.conservative_rul_cycles === null
                          ? "Not available"
                          : `${item.conservative_rul_cycles.toFixed(0)} cycles`}
                      </td>
                      <td className="numeric">
                        {item.rotational_speed_rpm.toLocaleString()}{" "}
                        <span className="muted">rpm</span>
                      </td>
                      <td className="numeric">
                        {item.torque_nm} <span className="muted">Nm</span>
                      </td>
                      <td className="numeric">
                        {item.tool_wear_min} <span className="muted">min</span>
                      </td>
                    </tr>
                  ))}
              {(waiting || !history.length) && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state compact">
                      <strong>
                        {waiting
                          ? "Loading assessment history…"
                          : error
                            ? "History could not be loaded"
                            : "No saved assessments"}
                      </strong>
                      <p>
                        {error ||
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
            Most recent first · {selected?.asset_tag ?? "No asset selected"}
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
              disabled={(historyCurrentPage + 1) * PAGE_SIZE >= history.length}
              onClick={() => setHistoryPage(historyCurrentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
