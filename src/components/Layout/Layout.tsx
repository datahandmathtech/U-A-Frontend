import React, { useState, Suspense } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PageLoader from '../PageLoader';

const drawerWidth = 280;

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  const user = useSelector((state: any) => state.auth.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If worker or manager lands on ERP layout, redirect them to their dedicated dashboards
  if (user?.role === 'worker') {
    return <Navigate to="/worker" replace />;
  }
  if (user?.role === 'manager') {
    return <Navigate to="/manager" replace />;
  }

  // Access Control: Check user modulesAccess
  if (user?.modulesAccess && Array.isArray(user.modulesAccess) && user.modulesAccess.length > 0) {
    const currentPath = location.pathname;
    const firstAllowedPath = user.modulesAccess[0] || '/login';

    // If on Dashboard root '/' but '/' is not permitted in modulesAccess
    if (currentPath === '/' && !user.modulesAccess.includes('/')) {
      return <Navigate to={firstAllowedPath} replace />;
    }

    // Check if the current route is authorized
    const isAuthorized = user.modulesAccess.some((allowedPath: string) => {
      if (allowedPath === '/') {
        return currentPath === '/';
      }
      return currentPath === allowedPath || currentPath.startsWith(allowedPath + '/');
    });

    if (!isAuthorized) {
      return <Navigate to={firstAllowedPath} replace />;
    }
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Topbar handleDrawerToggle={handleDrawerToggle} drawerWidth={drawerWidth} />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} drawerWidth={drawerWidth} />
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
};

export default Layout;
