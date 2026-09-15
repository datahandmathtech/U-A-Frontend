import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import PageLoader from './components/PageLoader';

// Directly import all page components for instant 0ms tab switching & zero layout flash
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import LogBook from './pages/LogBook';
import PieceTracker from './pages/PieceTracker';
import VendorLedger from './pages/VendorLedger';
import VendorLedgerDetails from './pages/VendorLedgerDetails';
import WasteLedger from './pages/WasteLedger';
import CRM from './pages/CRM';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import SlabPieceTracker from './pages/SlabPieceTracker';
import StageDetails from './pages/StageDetails';
import Approvals from './pages/Approvals';
import InOutLedger from './pages/InOutLedger';
import VendorsList from './pages/VendorsList';
import Accounts from './pages/Accounts';
import Inventory from './pages/Inventory';
import InventoryLedger from './pages/InventoryLedger';
import ItemLedger from './pages/ItemLedger';
import Production from './pages/Production';
import AdminConsole from './pages/AdminConsole';
import Dispatch from './pages/Dispatch';
import Machines from './pages/Machines';
import HR from './pages/HR';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import WorkerDashboard from './pages/WorkerDashboard';
import ManagerDashboard from './pages/ManagerDashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: (
      <Suspense fallback={<PageLoader isFullPage />}>
        <NotFound />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: 'live-feed',
        element: <LiveFeed />
      },
      {
        path: 'log-book',
        element: <LogBook />
      },
      {
        path: 'pieces',
        element: <PieceTracker />
      },
      {
        path: 'vendor-ledger',
        element: <VendorLedger />
      },
      {
        path: 'vendor-ledger/:vendorName',
        element: <VendorLedgerDetails />
      },
      {
        path: 'waste-ledger',
        element: <WasteLedger />
      },
      {
        path: 'crm',
        element: <CRM />
      },
      {
        path: 'crm/:id',
        element: <ProjectDetails />
      },
      {
        path: 'projects',
        element: <Projects />
      },
      {
        path: 'projects/:id',
        element: <ProjectDetails />
      },
      {
        path: 'projects/:id/slab/:slabId',
        element: <SlabPieceTracker />
      },
      {
        path: 'projects/:id/slab/:slabId/stage/:stageName',
        element: <StageDetails />
      },
      {
        path: 'approvals',
        element: <Approvals />
      },
      {
        path: 'in-out-ledger',
        element: <InOutLedger />
      },
      {
        path: 'vendors',
        element: <VendorsList />
      },
      {
        path: 'vendors/:id',
        element: <VendorLedger />
      },
      {
        path: 'accounts',
        element: <Accounts />
      },
      {
        path: 'inventory',
        element: <Inventory />
      },
      {
        path: 'inventory/ledger/:supplier',
        element: <InventoryLedger />
      },
      {
        path: 'inventory/item/:itemId',
        element: <ItemLedger />
      },
      {
        path: 'production',
        element: <Production />
      },
      {
        path: 'admin-console',
        element: <AdminConsole />
      },
      {
        path: 'dispatch',
        element: <Dispatch />
      },
      {
        path: 'machines',
        element: <Machines />
      },
      {
        path: 'hr',
        element: <HR />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader isFullPage message="Authenticating..." />}>
        <Login />
      </Suspense>
    )
  },
  {
    path: '/worker',
    element: (
      <Suspense fallback={<PageLoader isFullPage message="Loading Worker Portal..." />}>
        <WorkerDashboard />
      </Suspense>
    )
  },
  {
    path: '/manager',
    element: (
      <Suspense fallback={<PageLoader isFullPage message="Loading Manager Portal..." />}>
        <ManagerDashboard />
      </Suspense>
    )
  }
]);

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
