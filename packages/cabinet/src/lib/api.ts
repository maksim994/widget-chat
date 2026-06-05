import { parseApiError, type AuthResponse, type AuthUser } from "@widget/shared";

const TOKEN_KEY = "widget_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<T> {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const token = getToken();

  const res = await fetch(path, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = parseApiError(body, res.statusText);

    if (res.status === 401 && !skipAuthRedirect) {
      setToken(null);
      const isAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/register";
      if (!isAuthPage) {
        window.location.assign("/login");
      }
    }

    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type { AuthUser, AuthResponse };

export type Site = {
  id: string;
  publicKey: string;
  name: string;
  domain: string;
  active: boolean;
  widgetColor: string;
  widgetTitle: string;
  widgetGreeting: string;
  widgetPosition: string;
  offlineMessage: string;
  metrikaCounterId: string | null;
  workHoursStart: number | null;
  workHoursEnd: number | null;
  workDays: string | null;
};

export type DialogListItem = {
  id: string;
  status: string;
  isOffline: boolean;
  pageUrl: string | null;
  utmSource: string | null;
  firstMessageAt: string;
  site: { id: string; name: string; domain: string };
  visitor: { id: string; name: string | null; email: string | null; phone: string | null };
  operator: { id: string; name: string } | null;
  lastMessage: { body: string; sender: string; createdAt: string } | null;
};

export type DialogDetail = DialogListItem & {
  messages: {
    id: string;
    sender: string;
    body: string;
    status?: string;
    createdAt: string;
  }[];
  utmMedium: string | null;
  utmCampaign: string | null;
};
