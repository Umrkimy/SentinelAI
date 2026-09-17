"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Gauge } from "lucide-react";
import {
  createStoredPrediction,
  type SensorReadingInput,
  type StoredPrediction,
} from "@/lib/api";

const fields: {
  name: keyof SensorReadingInput;
  label: string;
  unit: string;
  placeholder: string;
  min: number;
}[] = [
  {
    name: "air_temperature_k",
    label: "Air temperature",
    unit: "K",
    placeholder: "300",
    min: 0.01,
  },
  {
    name: "process_temperature_k",
    label: "Process temperature",
    unit: "K",
    placeholder: "310",
    min: 0.01,
  },
  {
    name: "rotational_speed_rpm",
    label: "Rotational speed",
    unit: "rpm",
    placeholder: "1400",
    min: 0,
  },
  { name: "torque_nm", label: "Torque", unit: "Nm", placeholder: "65", min: 0 },
  {
    name: "tool_wear_min",
    label: "Tool wear",
    unit: "min",
    placeholder: "220",
    min: 0,
  },
  {
    name: "operating_cycle",
    label: "Operating cycle",
    unit: "cycle",
    placeholder: "400",
    min: 1,
  },
];

export function PredictionForm({
  equipmentId,
  onPredictionCreated,
}: {
  equipmentId: number | null;
  onPredictionCreated: () => void;
}) {
  const [result, setResult] = useState<StoredPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (equipmentId === null || isSubmitting) return;
    const data = new FormData(event.currentTarget);
    const values = fields.map(({ name, min }) => ({
      name,
      raw: String(data.get(name) ?? ""),
      min,
    }));
    if (
      values.some(
        ({ raw, min }) =>
          !raw.trim() || !Number.isFinite(Number(raw)) || Number(raw) < min,
      )
    ) {
      setError("Enter valid sensor readings and an operating cycle.");
      return;
    }
    const reading = Object.fromEntries(
      values.map(({ name, raw }) => [name, Number(raw)]),
    ) as SensorReadingInput;
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const prediction = await createStoredPrediction(equipmentId, reading);
      setResult(prediction);
      onPredictionCreated();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save this assessment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <section className="panel prediction-panel">
      <div className="panel-heading">
        <div>
          <h2>Run an assessment</h2>
          <p>Enter the current sensor readings for this asset.</p>
        </div>
        <Gauge size={19} />
      </div>
      <form onSubmit={handleSubmit} className="prediction-form">
        <fieldset
          disabled={equipmentId === null || isSubmitting}
          className="sensor-fields"
        >
          {fields.map((field) => (
            <label key={field.name}>
              {field.label}
              <span className="input-unit">
                <input
                  name={field.name}
                  type="number"
                  required
                  step="any"
                  min={field.min}
                  placeholder={field.placeholder}
                />
                <span>{field.unit}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="form-bottom">
          <p>
            {equipmentId === null
              ? "Register and select equipment to begin."
              : "Use measured values and the current operating cycle."}
            </p>
          <button
            className="button primary"
            type="submit"
            disabled={equipmentId === null || isSubmitting}
          >
            {isSubmitting ? "Assessing…" : "Run assessment"}
            <ArrowRight size={16} />
          </button>
        </div>
        {result && (
          <div
            className={`result-message ${result.risk === "HIGH" ? "result-high" : ""}`}
            role="status"
          >
            <CheckCircle2 size={17} />
            <span>
              Assessment saved · {result.risk === "HIGH" ? "High" : "Low"} risk
              · {(result.failure_probability * 100).toFixed(2)}% failure
              probability
              {result.conservative_rul_cycles !== null
                ? ` · plan within ${result.conservative_rul_cycles.toFixed(0)} cycles`
                : ""}
            </span>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
