import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from './features/auth/AuthPage';
import { Shell } from './layouts/Shell';
import { api, getToken } from './services/api';
import type { ApiResponse, User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    api<ApiResponse<{ user: User }>>('/auth/me')
      .then((result) => setUser(result.data.user))
      .catch(() => localStorage.removeItem('gitzone_access_token'))
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    localStorage.removeItem('gitzone_access_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="logo-mark">G</div>
        <span>GitZone yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" onAuth={setUser} />}
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/" replace /> : <AuthPage mode="register" onAuth={setUser} />
          }
        />
        <Route
          path="*"
          element={
            user ? <Shell user={user} onSignOut={signOut} /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
