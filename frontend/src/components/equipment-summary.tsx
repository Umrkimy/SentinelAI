import { Activity, Box, Factory, ShieldCheck } from "lucide-react";
import type { Equipment, PredictionHistoryItem } from "@/lib/api";

export function EquipmentSummary({
  equipment,
  selected,
  history,
  latest,
  loading,
  waiting,
  hasEquipmentError,
  historyError,
}: {
  equipment: Equipment[];
  selected: Equipment | undefined;
  history: PredictionHistoryItem[];
  latest: PredictionHistoryItem | undefined;
  loading: boolean;
  waiting: boolean;
  hasEquipmentError: boolean;
  historyError: string | null;
}) {
  const unavailable = loading || (hasEquipmentError && !equipment.length);

  return (
    <section className="stats" aria-label="Equipment summary">
      <article className="stat">
        <div className="stat-label">
          Registered equipment <Box size={17} />
        </div>
        <div className="stat-value">
          {unavailable ? "—" : equipment.length.toString().padStart(2, "0")}
        </div>
        <p>Assets registered in SentinelAI</p>
      </article>
      <article className="stat">
        <div className="stat-label">
          Active equipment <Factory size={17} />
        </div>
        <div className="stat-value">
          {unavailable
            ? "—"
            : equipment
                .filter((item) => item.is_active)
                .length.toString()
                .padStart(2, "0")}
        </div>
        <p>Registration status, not a risk diagnosis</p>
      </article>
      <article className="stat">
        <div className="stat-label">
          Saved assessments <Activity size={17} />
        </div>
        <div className="stat-value">{waiting || historyError ? "—" : history.length}</div>
        <p>{selected ? `For ${selected.asset_tag}` : "Select equipment"}</p>
      </article>
      <article className="stat">
        <div className="stat-label">
          Latest risk signal <ShieldCheck size={17} />
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
  );
}
