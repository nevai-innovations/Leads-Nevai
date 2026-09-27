import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { Icon, Loading } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/leads/new', label: 'Add Lead', icon: 'add' },
  { to: '/leads', label: 'Leads', icon: 'list', end: false },
  { to: '/follow-ups', label: 'Follow-ups', icon: 'calendar' },
  { to: '/reports', label: 'Reports', icon: 'report' },
];

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  // "/leads" should not light up while on "/leads/new"
  const isActive = (to: string, end?: boolean) => {
    if (to === '/leads') return pathname === '/leads' || (/^\/leads\/[^/]+/.test(pathname) && pathname !== '/leads/new');
    return end ? pathname === to : pathname.startsWith(to);
  };

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="car" size={20} />
          </span>
          <span>
            <strong>Car Wash</strong>
            <small>Lead Collector</small>
          </span>
        </div>
        <nav>
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={() => (isActive(n.to, n.end) ? 'nav-link active' : 'nav-link')}>
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="sidebar-foot">Kerala market survey</p>
      </aside>

      <header className="topbar">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="car" size={18} />
        </span>
        <strong>Car Wash Lead Collector</strong>
      </header>

      <main id="main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="bottom-nav" aria-label="Primary mobile">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={() => `bottom-link${isActive(n.to, n.end) ? ' active' : ''}${n.to === '/leads/new' ? ' primary' : ''}`}
          >
            <Icon name={n.icon} size={n.to === '/leads/new' ? 22 : 20} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
