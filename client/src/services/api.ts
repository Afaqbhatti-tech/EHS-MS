const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('ehs_token');
  const headers: Record<string, string> = { 'Accept': 'application/json', 'ngrok-skip-browser-warning': '1' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.status === 503
        ? 'Backend server is unavailable. Please ensure the server is running.'
        : `Server returned an unexpected response (${res.status}).`
    );
  }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('ehs_token');
      localStorage.removeItem('ehs_user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'API request failed');
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'DELETE', ...(data ? { body: JSON.stringify(data) } : {}) }),
  download: async (endpoint: string, filename?: string): Promise<void> => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('ehs_token');
        localStorage.removeItem('ehs_user');
        window.location.href = '/login';
      }
      throw new Error(`Download failed (${res.status})`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    const match = disposition?.match(/filename="?([^";\n]+)"?/);
    const name = filename || match?.[1] || 'download';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  uploadForm: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('ehs_token');
        localStorage.removeItem('ehs_user');
        window.location.href = '/login';
      }
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Upload failed');
    }
    return res.json();
  },
  upload: async <T>(endpoint: string, files: File[]): Promise<T> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files[]', f));
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Upload failed');
    }
    return res.json();
  },
};
