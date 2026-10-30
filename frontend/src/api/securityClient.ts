import { TokenVault } from '@/security/tokenVault';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Hardened Zero-Trust API Request Interceptor:
 * 1. Injects volatile in-memory JWT from TokenVault (never reading from localStorage).
 * 2. Injects X-Tenant-ID and security headers.
 * 3. Intercepts 401s and executes single-flight refresh mutex via TokenVault.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = TokenVault.getToken();
  const tenantId = TokenVault.getTenantId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(0, netErr?.message || 'Network connection failed', null);
  }

  // Handle 401 Unauthorized with Single-Flight Refresh Mutex
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    console.info('[SecurityClient] 401 encountered. Entering single-flight refresh queue...');

    const refreshedToken = await TokenVault.getOrRunRefresh(async () => {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error('Refresh token invalid or expired');
      }
      const data = await res.json();
      return {
        access_token: data.access_token,
        tenant_id: data.tenant_id,
      };
    });

    if (refreshedToken) {
      // Retry request with rotated token
      headers['Authorization'] = `Bearer ${refreshedToken}`;
      const retryResponse = await fetch(url, {
        ...options,
        headers,
      });
      if (retryResponse.ok) {
        return retryResponse.json();
      }
      response = retryResponse;
    }
  }

  if (!response.ok) {
    let errorDetail = response.statusText;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData.detail) {
        errorDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // Fallback to status text
    }
    throw new ApiError(response.status, errorDetail, errorData);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return apiRequest<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, data?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put: <T>(endpoint: string, data?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete: <T>(endpoint: string) => {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },
};
