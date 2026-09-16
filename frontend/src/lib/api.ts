export type Equipment = {
  id: number;
  asset_tag: string;
  machine_type: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
};

export type EquipmentInput = {
  asset_tag: string;
  machine_type: string;
  location: string | null;
};

export type PredictionHistoryItem = {
  prediction_id: number;
  sensor_reading_id: number;
  equipment_id: number;
  model_name: string;
  failure_probability: number;
  risk: "LOW" | "HIGH";
  threshold: number;
  recorded_at: string;
  air_temperature_k: number;
  process_temperature_k: number;
  rotational_speed_rpm: number;
  torque_nm: number;
  tool_wear_min: number;
};

export type SensorReadingInput = {
  air_temperature_k: number;
  process_temperature_k: number;
  rotational_speed_rpm: number;
  torque_nm: number;
  tool_wear_min: number;
};

export type StoredPrediction = {
  failure_probability: number;
  risk: "LOW" | "HIGH";
  threshold: number;
  prediction_id: number;
  sensor_reading_id: number;
  equipment_id: number;
  model_name: string;
  created_at: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
      ...options,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error(
      "Unable to reach the SentinelAI API. Check the connection and retry.",
    );
  }

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        "This asset tag is already registered. Use a unique asset tag.",
      );
    }
    if (response.status === 422) {
      throw new Error(
        "Some values were not accepted. Check your entries and try again.",
      );
    }
    throw new Error(
      `The request could not be completed (${response.status}). Please try again.`,
    );
  }

  return response.json();
}

export function getEquipment(): Promise<Equipment[]> {
  return apiRequest<Equipment[]>("/equipment");
}

export function createEquipment(equipment: EquipmentInput): Promise<Equipment> {
  return apiRequest<Equipment>("/equipment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(equipment),
  });
}

export function getPredictionHistory(
  equipmentId: number,
): Promise<PredictionHistoryItem[]> {
  return apiRequest<PredictionHistoryItem[]>(
    `/equipment/${equipmentId}/predictions`,
  );
}

export function createStoredPrediction(
  equipmentId: number,
  reading: SensorReadingInput,
): Promise<StoredPrediction> {
  return apiRequest<StoredPrediction>(`/equipment/${equipmentId}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reading),
  });
}
