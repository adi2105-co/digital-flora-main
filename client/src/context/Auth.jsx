import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);

  const loadBookmarks = useCallback(() => api.bookmarks().then(setBookmarks).catch(() => setBookmarks([])), []);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.me().then((r) => { setUser(r.user); return loadBookmarks(); }).catch(() => setToken(null)).finally(() => setReady(true));
  }, [loadBookmarks]);

  const finish = (r) => { setToken(r.token); setUser(r.user); loadBookmarks(); return r.user; };
  const value = {
    user, ready, bookmarks,
    login: async (b) => finish(await api.login(b)),
    register: async (b) => finish(await api.register(b)),
    logout: () => { setToken(null); setUser(null); setBookmarks([]); },
    isBookmarked: (id) => bookmarks.some((b) => b.id === id),
    toggleBookmark: async (id) => {
      if (bookmarks.some((b) => b.id === id)) await api.removeBookmark(id); else await api.addBookmark(id);
      await loadBookmarks();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
