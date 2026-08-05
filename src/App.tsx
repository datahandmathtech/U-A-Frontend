import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import { Box, Typography } from '@mui/material';
import NotFound from './pages/NotFound';

import CRM from './pages/CRM';
import Projects from './pages/Projects';
import Accounts from './pages/Accounts';
import Inventory from './pages/Inventory';
import Production from './pages/Production';
import Dispatch from './pages/Dispatch';
import HR from './pages/HR';
import Approvals from './pages/Approvals';
import InOutLedger from './pages/InOutLedger';
import VendorsList from './pages/VendorsList';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Machines from './pages/Machines';
import ProjectDetails from './pages/ProjectDetails';
import LogBook from './pages/LogBook';
import PieceTracker from './pages/PieceTracker';
import VendorLedger from './pages/VendorLedger';
import VendorLedgerDetails from './pages/VendorLedgerDetails';
import SlabPieceTracker from './pages/SlabPieceTracker';
import StageDetails from './pages/StageDetails';

import Login from './pages/Login';
import WorkerDashboard from './pages/WorkerDashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFound />,
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
        path: 'production',
        element: <Production />
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
    element: <Login />
  },
  {
    path: '/worker',
    element: <WorkerDashboard />
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
