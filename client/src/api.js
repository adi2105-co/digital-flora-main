const TOKEN_KEY = 'df_token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

async function req(path, { method = 'GET', body, form } = {}) {
  const headers = {}; const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  let payload;
  if (form) payload = form; else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(`/api${path}`, { method, headers, body: payload }); }
  catch { throw new Error('Cannot reach the server. Is the backend running?'); }
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) { const e = new Error(data?.error || `Request failed (${res.status})`); e.status = res.status; throw e; }
  return data;
}

export const api = {
  stats: () => req('/plants/stats'),
  plants: () => req('/plants'),
  regions: () => req('/plants/regions'),
  suggest: (q, dosha) => req(`/plants/suggest?q=${encodeURIComponent(q)}${dosha ? `&dosha=${dosha}` : ''}`),
  createPlant: (b) => req('/plants', { method: 'POST', body: b }),
  updatePlant: (slug, b) => req(`/plants/${slug}`, { method: 'PUT', body: b }),
  deletePlant: (slug) => req(`/plants/${slug}`, { method: 'DELETE' }),
  register: (b) => req('/auth/register', { method: 'POST', body: b }),
  login: (b) => req('/auth/login', { method: 'POST', body: b }),
  me: () => req('/auth/me'),
  bookmarks: () => req('/me/bookmarks'),
  addBookmark: (id) => req(`/me/bookmarks/${id}`, { method: 'PUT' }),
  removeBookmark: (id) => req(`/me/bookmarks/${id}`, { method: 'DELETE' }),
  notes: () => req('/me/notes'),
  saveNote: (id, body) => req(`/me/notes/${id}`, { method: 'PUT', body: { body } }),
  consultations: () => req('/consultations'),
  ask: (b) => req('/consultations', { method: 'POST', body: b }),
  reply: (id, b) => req(`/consultations/${id}/reply`, { method: 'POST', body: b }),
  identify: (form) => req('/identify', { method: 'POST', form }),
  history: () => req('/identify/history'),
};
