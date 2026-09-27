import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles.css';
import Layout from './components/Layout';
import { ToastProvider } from './components/ui';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LeadForm = lazy(() => import('./pages/LeadForm'));
const LeadsList = lazy(() => import('./pages/LeadsList'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Reports = lazy(() => import('./pages/Reports'));
const NotFound = lazy(() => import('./pages/NotFound'));

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/leads', element: <LeadsList /> },
      { path: '/leads/new', element: <LeadForm /> },
      { path: '/leads/:id', element: <LeadDetail /> },
      { path: '/leads/:id/edit', element: <LeadForm /> },
      { path: '/follow-ups', element: <FollowUps /> },
      { path: '/reports', element: <Reports /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>,
);
