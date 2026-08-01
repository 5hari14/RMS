const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DailyForecast {
  date: string;
  strategy: string;
  predicted_covers: number;
  confidence_low: number;
  confidence_high: number;
}

interface HourlyForecastEntry {
  hour: number;
  predicted_covers: number;
  strategy: string;
}

interface HourlyForecast {
  date: string;
  hours: HourlyForecastEntry[];
}

interface WeeklyForecast {
  start_date: string;
  days: DailyForecast[];
  total_predicted_covers: number;
}

interface RevenueForecast {
  date: string;
  predicted_covers: number;
  average_spend: number;
  predicted_revenue: number;
  revenue_low: number;
  revenue_high: number;
  strategy: string;
}

interface WeeklyRevenueForecast {
  start_date: string;
  days: RevenueForecast[];
  total_predicted_revenue: number;
}

interface TrainingResult {
  restaurant_id: string;
  status: string;
  message: string;
}

interface TrainingStatus {
  restaurant_id: string;
  strategy: string;
  data_days: number;
  has_prophet_model: boolean;
  has_xgboost_model: boolean;
}

interface HealthStatus {
  status: string;
  version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAI<T>(path: string): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`AI service error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function postAI<T>(path: string): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`AI service error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Forecast endpoints
// ─────────────────────────────────────────────────────────────────────────────

export async function getDailyForecast(
  restaurantId: string,
  date?: string,
): Promise<DailyForecast> {
  const params = date ? `?date=${date}` : "";
  return fetchAI(`/api/v1/forecast/daily/${restaurantId}${params}`);
}

export async function getHourlyForecast(
  restaurantId: string,
  date?: string,
): Promise<HourlyForecast> {
  const params = date ? `?date=${date}` : "";
  return fetchAI(`/api/v1/forecast/hourly/${restaurantId}${params}`);
}

export async function getWeeklyForecast(
  restaurantId: string,
  startDate?: string,
): Promise<WeeklyForecast> {
  const params = startDate ? `?start_date=${startDate}` : "";
  return fetchAI(`/api/v1/forecast/weekly/${restaurantId}${params}`);
}

export async function getDailyRevenueForecast(
  restaurantId: string,
  date?: string,
): Promise<RevenueForecast> {
  const params = date ? `?date=${date}` : "";
  return fetchAI(`/api/v1/forecast/revenue/daily/${restaurantId}${params}`);
}

export async function getWeeklyRevenueForecast(
  restaurantId: string,
  startDate?: string,
): Promise<WeeklyRevenueForecast> {
  const params = startDate ? `?start_date=${startDate}` : "";
  return fetchAI(`/api/v1/forecast/revenue/weekly/${restaurantId}${params}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Training endpoints
// ─────────────────────────────────────────────────────────────────────────────

export async function triggerTraining(
  restaurantId: string,
): Promise<TrainingResult> {
  return postAI(`/api/v1/training/trigger/${restaurantId}`);
}

export async function getTrainingStatus(
  restaurantId: string,
): Promise<TrainingStatus> {
  return fetchAI(`/api/v1/training/status/${restaurantId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

export async function getAIServiceHealth(): Promise<HealthStatus> {
  return fetchAI("/api/v1/health");
}
