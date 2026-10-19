import { supabase } from '../lib/supabase';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocal ? 'http://localhost:8000/api/v1' : 'https://lockstep-d6b5.onrender.com/api/v1');

let currentPersona = {
  email: 'member@newtonite.io',
  role: 'member',
  name: 'Alex Member',
};

export function setApiPersona(email: string, role: string, name: string) {
  currentPersona = { email, role, name };
}

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token || 'dev-token';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Email': currentPersona.email,
    'X-User-Role': currentPersona.role,
    'X-User-Name': currentPersona.name,
    ...(options.headers as Record<string, string>),
  };

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const message =
      typeof errorData.detail === 'string'
        ? errorData.detail
        : errorData.detail?.message || `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, errorData.detail || errorData);
  }

  return response.json();
}
