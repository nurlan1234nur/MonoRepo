import { API_ORIGIN } from '../config/env';
import { getToken } from './tokenStorage';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_ORIGIN) {
    throw new ApiError('EXPO_PUBLIC_API_ORIGIN is not configured', 0);
  }

  const token = await getToken();
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Request failed', res.status);
  }

  return data as T;
}

