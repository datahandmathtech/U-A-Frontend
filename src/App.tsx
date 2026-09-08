import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import PageLoader from './components/PageLoader';

// Lazy load all page components for instant initial app load & low bundle size
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveFeed = lazy(() => import('./pages/LiveFeed'));
const LogBook = lazy(() => import('./pages/LogBook'));
const PieceTracker = lazy(() => import('./pages/PieceTracker'));
const VendorLedger = lazy(() => import('./pages/VendorLedger'));
const VendorLedgerDetails = lazy(() => import('./pages/VendorLedgerDetails'));
const WasteLedger = lazy(() => import('./pages/WasteLedger'));
const CRM = lazy(() => import('./pages/CRM'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const SlabPieceTracker = lazy(() => import('./pages/SlabPieceTracker'));
const StageDetails = lazy(() => import('./pages/StageDetails'));
const Approvals = lazy(() => import('./pages/Approvals'));
const InOutLedger = lazy(() => import('./pages/InOutLedger'));
const VendorsList = lazy(() => import('./pages/VendorsList'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryLedger = lazy(() => import('./pages/InventoryLedger'));
const ItemLedger = lazy(() => import('./pages/ItemLedger'));
const Production = lazy(() => import('./pages/Production'));
const AdminConsole = lazy(() => import('./pages/AdminConsole'));
const Dispatch = lazy(() => import('./pages/Dispatch'));
const Machines = lazy(() => import('./pages/Machines'));
const HR = lazy(() => import('./pages/HR'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Login = lazy(() => import('./pages/Login'));
const WorkerDashboard = lazy(() => import('./pages/WorkerDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));

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
