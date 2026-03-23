// app/src/components/AppLayout.tsx
// Layout route guard that protects all authenticated routes.
// Shows a loading state while checking the session, redirects to /login if
// unauthenticated, or renders the app shell (header + Outlet) if authenticated.

import { Outlet, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from 'aws-amplify/auth';
import {
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthUser,
  logout,
} from '../store/authSlice';
import { useAuthInit } from '../hooks/useAuthInit';
import BottomNav from './BottomNav';

function AppLayout() {
  // Check for existing session on mount and sync to Redux
  useAuthInit();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const user = useSelector(selectAuthUser);
  const dispatch = useDispatch();

  const handleSignOut = async () => {
    try {
      await signOut({
        global: true,
        oauth: {
          redirectUrl: `${window.location.origin}/login`,
        },
      });
    } finally {
      dispatch(logout());
    }
  };

  // While checking session, show a loading indicator (prevents flash of login page)
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated — render the app shell with child routes
  return (
    <div className="app-layout">
      <header>
        <span>Crypto Transaction Tracker</span>
        <span>{user?.email}</span>
        <button onClick={handleSignOut}>Sign out</button>
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default AppLayout;
