import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const ROUTE_LABELS = {
  '': 'Dashboard',
  artists: 'Artists',
  projects: 'Projects',
  users: 'Users',
  pass: 'Pass',
  port: 'Port',
  assets: 'Assets',
  placements: 'Placements',
  contacts: 'Contacts',
  templates: 'Templates',
  tasks: 'Tasks',
  analytics: 'Analytics',
  business: 'Business Ops',
  calendar: 'Calendar',
  settings: 'Settings',
  admin: 'Admin',
};

function isUuid(segment) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = [{ label: 'Dashboard', path: '/' }];
  let currentPath = '';

  segments.forEach((seg) => {
    currentPath += `/${seg}`;
    if (isUuid(seg)) {
      crumbs.push({ label: 'Detail', path: currentPath });
    } else {
      crumbs.push({
        label: ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
        path: currentPath,
      });
    }
  });

  if (crumbs.length <= 1) return null;

  return (
    <nav style={{
      fontSize: '12px',
      color: 'var(--color-text-muted)',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      flexWrap: 'wrap',
    }}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {i > 0 && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            {isLast ? (
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
