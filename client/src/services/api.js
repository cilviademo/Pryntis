const API_BASE = '/api/v1';
const TOKEN_KEY = 'pryntis_token';

// Token store — persisted in sessionStorage so page refresh keeps you logged in
let authToken = sessionStorage.getItem(TOKEN_KEY);

// Warmup — detect cold start and provide status
let _warmupChecked = false;
let _warmupResolve = null;
const warmupPromise = new Promise((resolve) => { _warmupResolve = resolve; });

async function checkWarmup() {
  if (_warmupChecked) return;
  const maxRetries = 4;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(8000) });
      if (res.ok) { _warmupChecked = true; _warmupResolve(true); return; }
    } catch { /* retry */ }
    // Show banner
    const banner = document.getElementById('warmup-banner');
    if (banner) banner.style.display = 'block';
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  _warmupChecked = true;
  _warmupResolve(true);
  const banner = document.getElementById('warmup-banner');
  if (banner) banner.style.display = 'none';
}

// Start warmup check immediately
checkWarmup();

const api = {
  setToken(token) {
    authToken = token;
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  },

  getToken() {
    return authToken;
  },

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, options);

    // Handle non-JSON responses
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!res.ok) {
        const err = new Error(`Request failed with status ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return null;
    }

    const json = await res.json();

    if (!json.success) {
      const err = new Error(json.error?.message || 'Request failed');
      err.code = json.error?.code;
      err.details = json.error?.details;
      err.status = res.status;
      throw err;
    }

    return json.data;
  },

  /**
   * Same as request() but returns the full response envelope:
   * { data, pagination, message }
   */
  async getFullResponse(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, options);
    const json = await res.json();

    if (!json.success) {
      const err = new Error(json.error?.message || 'Request failed');
      err.code = json.error?.code;
      err.details = json.error?.details;
      err.status = res.status;
      throw err;
    }

    return {
      data: json.data,
      pagination: json.pagination || null,
      message: json.message || null,
    };
  },

  get(path) {
    return this.request('GET', path);
  },
  post(path, body) {
    return this.request('POST', path, body);
  },
  put(path, body) {
    return this.request('PUT', path, body);
  },
  del(path) {
    return this.request('DELETE', path);
  },
};

export default api;
