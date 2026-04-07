import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isVendor = user?.role === 'vendor';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>ResumeTracker</h1>
          <p>{user?.fullName || user?.full_name}</p>
        </div>
        <ul className="sidebar-nav">
          {!isVendor && (
            <>
              <li>
                <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>
                  <span>📋</span> <span>Pipeline</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/candidates" className={({isActive}) => isActive ? 'active' : ''}>
                  <span>👤</span> <span>Candidates</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/vendors" className={({isActive}) => isActive ? 'active' : ''}>
                  <span>🏢</span> <span>Vendors</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/reports" className={({isActive}) => isActive ? 'active' : ''}>
                  <span>📊</span> <span>Reports</span>
                </NavLink>
              </li>
            </>
          )}
          {isVendor && (
            <li>
              <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>
                <span>📋</span> <span>My Candidates</span>
              </NavLink>
            </li>
          )}
          <li style={{ marginTop: 'auto' }}>
            <button onClick={handleLogout}>
              <span>🚪</span> <span>Logout</span>
            </button>
          </li>
        </ul>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
