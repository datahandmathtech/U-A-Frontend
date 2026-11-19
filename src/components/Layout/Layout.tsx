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

  // If worker lands on ERP layout without explicit modules, redirect to dedicated worker portal
  if (user?.role === 'worker' && (!user?.modulesAccess || user.modulesAccess.length === 0)) {
    return <Navigate to="/worker" replace />;
  }

  // If manager lands on ERP layout without explicit modules, redirect to dedicated manager portal
  if (user?.role === 'manager' && (!user?.modulesAccess || user.modulesAccess.length === 0)) {
    return <Navigate to="/manager" replace />;
  }

  // Admins & Managers have full unrestricted access to all ERP modules when modulesAccess is not restricted
  const isSuper = (user?.role === 'admin' || user?.role === 'manager') && (!user?.modulesAccess || user.modulesAccess.length === 0);

  // Access Control: Check user modulesAccess for restricted employees
  if (!isSuper && user?.modulesAccess && Array.isArray(user.modulesAccess) && user.modulesAccess.length > 0) {
    const currentPath = location.pathname;
    const safePath = user.modulesAccess.includes('/') ? '/' : (user.modulesAccess[0] || '/');

    // Route alias mapping so subroutes and complementary views are never blocked
    const ROUTE_ALIASES: Record<string, string[]> = {
      '/': ['/live-feed', '/log-book', '/pieces'],
      '/projects': ['/crm', '/projects', '/pieces', '/log-book', '/live-feed', '/approvals', '/in-out-ledger'],
      '/crm': ['/crm', '/projects', '/pieces'],
      '/in-out-ledger': ['/in-out-ledger', '/vendors', '/vendor-ledger'],
      '/inventory': ['/inventory', '/waste-ledger'],
      '/machines': ['/machines', '/maintenance', '/log-book'],
      '/maintenance': ['/maintenance', '/machines', '/cash-book'],
      '/cash-book': ['/cash-book', '/maintenance']
    };

    // If on Dashboard root '/' but '/' is not permitted in modulesAccess
    if (currentPath === '/' && !user.modulesAccess.includes('/')) {
      return <Navigate to={safePath} replace />;
    }

    // Check if the current route is authorized
    const isAuthorized = user.modulesAccess.some((allowedPath: string) => {
      if (allowedPath === '/') {
        if (currentPath === '/') return true;
      }
      if (currentPath === allowedPath || currentPath.startsWith(allowedPath + '/')) {
        return true;
      }
      const aliases = ROUTE_ALIASES[allowedPath];
      if (aliases && aliases.some(a => currentPath === a || currentPath.startsWith(a + '/'))) {
        return true;
      }
      return false;
    });

    if (!isAuthorized && currentPath !== safePath) {
      return <Navigate to={safePath} replace />;
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
        sx={{ flexGrow: 1, p: { xs: 1, sm: 1.5, md: 2 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, minWidth: 0 }}
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
