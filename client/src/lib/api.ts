// Backend API client. Token-ийг localStorage-д хадгална.
const TOKEN_KEY = 'nous-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Алдаа гарлаа');
  }
  return data as T;
}

// Multipart (зураг) upload. Content-Type-ийг browser өөрөө boundary-тэй тавина.
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Алдаа гарлаа');
  }
  return data as T;
}

// Server-ийн статик зам (/uploads/...) — same-origin тул шууд буцаана.
const ASSET_ORIGIN = import.meta.env.VITE_ASSET_ORIGIN?.replace(/\/$/, '') ?? '';

export function assetUrl(path: string): string {
  if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  if (ASSET_ORIGIN && path.startsWith('/')) {
    return `${ASSET_ORIGIN}${path}`;
  }
  return path;
}
