export type ApiErrorBody = {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

export function apiError(message: string, code?: string, details?: unknown): ApiErrorBody {
  return { error: { message, code, details } };
}

export function parseApiError(data: unknown, fallback = "Ошибка запроса"): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as Record<string, unknown>;
  if (d.error && typeof d.error === "object" && d.error !== null) {
    const err = d.error as { message?: string };
    if (typeof err.message === "string") return err.message;
  }
  if (typeof d.error === "string") return d.error;
  if (typeof d.message === "string") return d.message;
  return fallback;
}
