const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers, params, body, ...customOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const isFormData = body instanceof FormData;
  const defaultHeaders: HeadersInit = {
    ...(!isFormData && body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const response = await fetch(url, {
    headers: defaultHeaders,
    credentials: 'include',
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    ...customOptions,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || (data && data.success === false)) {
    const errorMessage =
      data.error?.message ||
      data.message ||
      `Xatolik yuz berdi: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data as T;
}
