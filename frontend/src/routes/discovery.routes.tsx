import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';

const IPDiscovery = lazy(() => import('../pages/discovery/IPDiscovery').then(m => ({ default: m.IPDiscovery })));
const DeviceCredentials = lazy(() => import('../pages/discovery/DeviceCredentials').then(m => ({ default: m.DeviceCredentials })));
const Agents = lazy(() => import('../pages/discovery/Agents').then(m => ({ default: m.Agents })));

export const discoveryRoutes = (
  <>
    <Route path="/discovery/ip-discovery" element={<ProtectedRoute><MainLayout><IPDiscovery /></MainLayout></ProtectedRoute>} />
    <Route path="/discovery/device-credentials" element={<ProtectedRoute><MainLayout><DeviceCredentials /></MainLayout></ProtectedRoute>} />
    <Route path="/discovery/agents" element={<ProtectedRoute><MainLayout><Agents /></MainLayout></ProtectedRoute>} />
    <Route path="/discovery" element={<Navigate to="/discovery/ip-discovery" replace />} />
  </>
);
