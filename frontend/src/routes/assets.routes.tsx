import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';

const AllAssets = lazy(() => import('../pages/assets/AllAssets').then(m => ({ default: m.AllAssets })));
const AssetDetails = lazy(() => import('../pages/assets/components/AssetDetails').then(m => ({ default: m.AssetDetails })));
const SoftwareInventory = lazy(() => import('../pages/assets/SoftwareInventory').then(m => ({ default: m.SoftwareInventory })));
const SoftwareLicense = lazy(() => import('../pages/assets/SoftwareLicense').then(m => ({ default: m.SoftwareLicense })));
const Hub = lazy(() => import('../pages/hub/Hub').then(m => ({ default: m.Hub })));

export const assetsRoutes = (
  <>
    <Route path="/assets" element={<ProtectedRoute><MainLayout><AllAssets /></MainLayout></ProtectedRoute>} />
    <Route path="/assets/:id" element={<ProtectedRoute><MainLayout><AssetDetails /></MainLayout></ProtectedRoute>} />
    <Route path="/assets/software-inventory" element={<ProtectedRoute><MainLayout><SoftwareInventory /></MainLayout></ProtectedRoute>} />
    <Route path="/assets/software-license" element={<ProtectedRoute><MainLayout><SoftwareLicense /></MainLayout></ProtectedRoute>} />
    <Route path="/assets/hub" element={<ProtectedRoute><MainLayout><Hub /></MainLayout></ProtectedRoute>} />
    <Route path="/hub" element={<Navigate to="/assets/hub" replace />} />
    <Route path="/jobs/software-jobs/*" element={<Navigate to="/hub" replace />} />
    <Route path="/jobs" element={<Navigate to="/hub" replace />} />
  </>
);
