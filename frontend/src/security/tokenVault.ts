/**
 * Zero-Trust Volatile Token Store (Memory Isolation)
 * Neutralizes XSS token theft: Access tokens are stored strictly inside private module closure variables
 * and are NEVER written to window.localStorage, window.sessionStorage, or unencrypted IndexedDB.
 */

let _accessToken: string | null = null;
let _tenantId: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

// Purge any legacy tokens accidentally cached in localStorage on initialization
try {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('ubfd_auth_token');
    window.sessionStorage.removeItem('ubfd_auth_token');
  }
} catch {
  // Ignore in non-browser env
}

export const TokenVault = {
  getToken: (): string | null => _accessToken,
  
  getTenantId: (): string | null => _tenantId,

  setSession: (token: string, tenantId: string) => {
    _accessToken = token;
    _tenantId = tenantId;
  },

  clearSession: () => {
    _accessToken = null;
    _tenantId = null;
    _refreshPromise = null;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('ubfd_auth_token');
        window.sessionStorage.removeItem('ubfd_auth_token');
      }
    } catch {
      // Safe no-op
    }
  },

  /**
   * Single-Flight Refresh Mutex:
   * When concurrent parallel requests receive 401 Unauthorized,
   * only a single refresh promise executes. Concurrent callers await this promise
   * and retry seamlessly with the rotated token.
   */
  getOrRunRefresh: async (
    refreshFn: () => Promise<{ access_token: string; tenant_id: string }>
  ): Promise<string | null> => {
    if (!_refreshPromise) {
      _refreshPromise = refreshFn()
        .then((data) => {
          _accessToken = data.access_token;
          _tenantId = data.tenant_id;
          return _accessToken;
        })
        .catch((err) => {
          console.warn('[TokenVault] Token refresh rotation failed:', err);
          TokenVault.clearSession();
          return null;
        })
        .finally(() => {
          _refreshPromise = null;
        });
    }
    return _refreshPromise;
  },
};
