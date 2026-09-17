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
  anomaly_score: number | null;
  is_anomaly: boolean | null;
  anomaly_model_name: string | null;
  recorded_at: string;
  air_temperature_k: number;
  process_temperature_k: number;
  rotational_speed_rpm: number;
  torque_nm: number;
  tool_wear_min: number;
  operating_cycle: number | null;
  predicted_rul_cycles: number | null;
  conservative_rul_cycles: number | null;
  rul_model_name: string | null;
  rul_training_data_note: string | null;
};

export type SensorReadingInput = {
  air_temperature_k: number;
  process_temperature_k: number;
  rotational_speed_rpm: number;
  torque_nm: number;
  tool_wear_min: number;
  operating_cycle: number;
};

export type StoredPrediction = {
  failure_probability: number;
  risk: "LOW" | "HIGH";
  threshold: number;
  anomaly_score: number;
  is_anomaly: boolean;
  anomaly_model_name: string;
  prediction_id: number;
  sensor_reading_id: number;
  equipment_id: number;
  model_name: string;
  created_at: string;
  predicted_rul_cycles: number | null;
  conservative_rul_cycles: number | null;
  rul_model_name: string | null;
  rul_training_data_note: string | null;
};

export type DocumentSearchResult = {
  source_id: string;
  title: string;
  source_url: string | null;
  page_number: number;
  chunk_number: number;
  text: string;
  similarity_score: number;
};

export type DocumentSearchResponse = {
  query: string;
  results: DocumentSearchResult[];
};

export type AdminToken = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type UploadedDocument = {
  id: number;
  source_id: string;
  title: string;
  publisher: string | null;
  purpose: string;
  original_filename: string;
  file_size_bytes: number;
  status: string;
  uploaded_by: string;
  created_at: string;
};

export function searchDocuments(
  query: string,
  topK = 5,
): Promise<DocumentSearchResponse> {
  return apiRequest<DocumentSearchResponse>(
    "/documents/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        top_k: topK,
      }),
    },
    180_000,
  );
}

export function loginAdmin(
  username: string,
  password: string,
): Promise<AdminToken> {
  const body = new URLSearchParams({ username, password });
  return apiRequest<AdminToken>("/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export function getUploadedDocuments(token: string): Promise<UploadedDocument[]> {
  return apiRequest<UploadedDocument[]>("/documents/admin", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function uploadDocument(
  token: string,
  values: {
    file: File;
    sourceId: string;
    title: string;
    publisher: string;
    purpose: string;
  },
): Promise<UploadedDocument> {
  const form = new FormData();
  form.set("file", values.file);
  form.set("source_id", values.sourceId);
  form.set("title", values.title);
  form.set("publisher", values.publisher);
  form.set("purpose", values.purpose);

  return apiRequest<UploadedDocument>("/documents/admin/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 20_000,
): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error(
      "Unable to reach the SentinelAI API. Check the connection and retry.",
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload.detail === "string" ? payload.detail : null;
    if (response.status === 401) {
      throw new Error("Admin session expired. Sign in again.");
    }
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
      detail ?? `The request could not be completed (${response.status}). Please try again.`,
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
