"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createEquipment, type Equipment } from "@/lib/api";

export function EquipmentForm({
  onEquipmentCreated,
}: {
  onEquipmentCreated: (equipment: Equipment) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const asset_tag = String(data.get("asset_tag") ?? "").trim();
    const machine_type = String(data.get("machine_type") ?? "").trim();
    if (!asset_tag || !machine_type) {
      setError("Enter an asset tag and machine type.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createEquipment({
        asset_tag,
        machine_type,
        location: String(data.get("location") ?? "").trim() || null,
      });
      form.reset();
      onEquipmentCreated(created);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to register equipment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <section>
      <h2 id="register-title">Register equipment</h2>
      <p className="form-intro">
        Add an asset to your workspace to start recording assessments.
      </p>
      <form onSubmit={handleSubmit} className="registration-form">
        <fieldset disabled={isSubmitting}>
          <label>
            Asset tag <span className="required">*</span>
            <input
              name="asset_tag"
              placeholder="e.g. CNC-002"
              required
              maxLength={50}
            />
          </label>
          <label>
            Machine type <span className="required">*</span>
            <input
              name="machine_type"
              placeholder="e.g. CNC milling machine"
              required
              maxLength={100}
            />
          </label>
          <label>
            Location <span className="optional">Optional</span>
            <input
              name="location"
              placeholder="e.g. Workshop B"
              maxLength={100}
            />
          </label>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary"
          type="submit"
          disabled={isSubmitting}
        >
          <Plus size={16} />
          {isSubmitting ? "Registering…" : "Register equipment"}
        </button>
      </form>
    </section>
  );
}
