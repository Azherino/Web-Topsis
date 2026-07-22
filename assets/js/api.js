// ═══════════════════════════════════════════
// API Wrapper — Fetch Helper
// ═══════════════════════════════════════════

const API_BASE = 'api/';

const API = {
  async get(endpoint, params = {}) {
    const url = new URL(API_BASE + endpoint, location.origin + location.pathname);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request gagal' }));
        throw new Error(err.error || 'Request gagal');
      }
      return res.json();
    } catch (e) {
      showToast(e.message || 'Koneksi gagal', 'error');
      throw e;
    }
  },

  async post(endpoint, body = {}) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request gagal');
      return data;
    } catch (e) {
      showToast(e.message || 'Koneksi gagal', 'error');
      throw e;
    }
  },

  async put(endpoint, body = {}) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request gagal');
      return data;
    } catch (e) {
      showToast(e.message || 'Koneksi gagal', 'error');
      throw e;
    }
  },

  async delete(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request gagal');
      return data;
    } catch (e) {
      showToast(e.message || 'Koneksi gagal', 'error');
      throw e;
    }
  }
};
