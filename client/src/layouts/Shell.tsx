import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dashboard } from '../features/repositories/Dashboard';
import { NewRepository } from '../features/repositories/NewRepository';
import { RepositoryPage } from '../features/repositories/RepositoryPage';
import { Profile } from '../features/users/Profile';
import { Settings } from '../components/Settings';
import type { User } from '../types';
import { initials } from '../components/Avatar';
import { NotificationBell } from '../features/notifications/NotificationBell';

export function Shell({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gitzone_theme') === 'dark');
  const path = useLocation().pathname;
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('gitzone_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const content =
    path === '/' ? (
      <Dashboard user={user} />
    ) : path === '/repositories/new' ? (
      <NewRepository user={user} />
    ) : path === '/settings' ? (
      <Settings user={user} />
    ) : path.startsWith('/settings') ? (
      <Settings user={user} />
    ) : path.split('/').filter(Boolean).length === 1 ? (
      <Profile />
    ) : (
      <RepositoryPage />
    );
  return (
    <div className="app-shell">
      <Sidebar user={user} onSignOut={onSignOut} />
      <main className="main-content">
        <Topbar
          user={user}
          darkMode={darkMode}
          onThemeToggle={() => setDarkMode((value) => !value)}
        />
        <div className="page-wrap">{content}</div>
      </main>
    </div>
  );
}

export function Sidebar({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const path = useLocation().pathname;
  return (
    <aside className="sidebar">
      <Link to="/" className="brand">
        <span className="logo-mark">G</span>
        <span>GitZone</span>
      </Link>
      <div className="workspace-label">
        WORKSPACE <span>⌄</span>
      </div>
      <nav className="side-nav">
        <Link className={path === '/' ? 'active' : ''} to="/">
          ⌂ <span>Overview</span>
        </Link>
        <Link className={path.includes('/repositories') ? 'active' : ''} to="/">
          <span className="nav-icon">◈</span>
          <span>Repositories</span>
        </Link>
        <Link to="/">
          <span className="nav-icon">✦</span>
          <span>Explore</span>
        </Link>
      </nav>
      <div className="workspace-label repo-label">
        YOUR REPOSITORIES <Link to="/repositories/new">+</Link>
      </div>
      <div className="mini-repos">
        <Link to={`/${user.username}`}>
          <span className="repo-dot blue" />
          {user.username}
        </Link>
      </div>
      <div className="sidebar-bottom">
        <Link to="/settings" className={path === '/settings' ? 'active' : ''}>
          ⚙ <span>Settings</span>
        </Link>
        <button className="profile-mini" onClick={onSignOut}>
          <span className="avatar small">{initials(user)}</span>
          <span>
            <b>{user.name ?? user.username}</b>
            <small>@{user.username}</small>
          </span>
          <span>↪</span>
        </button>
      </div>
    </aside>
  );
}

export function Topbar({
  user,
  darkMode,
  onThemeToggle,
}: {
  user: User;
  darkMode: boolean;
  onThemeToggle: () => void;
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu">☰</button>
      <div className="search">
        <span>⌕</span>
        <input placeholder="Search repositories, users..." />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-actions">
        <NotificationBell />
        <button
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onThemeToggle}
        >
          {darkMode ? '☀' : '☾'}
        </button>
        <button title="Create">
          <Link to="/repositories/new">＋</Link>
        </button>
        <Link className="avatar" to={`/${user.username}`}>
          {initials(user)}
        </Link>
      </div>
    </header>
  );
}
