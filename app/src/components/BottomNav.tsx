// app/src/components/BottomNav.tsx
// Persistent bottom navigation bar rendered inside AppLayout.
// Uses NavLink for active-tab highlighting via React Router.

import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/data-sources', label: 'Data Sources', icon: '🔗' },
  // Future tabs: Data Input, Transactions, Buckets
];

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `bottom-nav-tab${isActive ? ' active' : ''}`
          }
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
