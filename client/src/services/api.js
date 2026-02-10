const API_BASE = '/api/v1';

// Simple token store — AuthContext sets this after login
let authToken = null;

const api = {
  setToken(token) {
    authToken = token;
  },

  async request(method, path, body) {
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

    return json.data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },
};

export default api;
