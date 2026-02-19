import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';

const AllPatches = lazy(() => import('../pages/patches/AllPatches').then(m => ({ default: m.AllPatches })));
const PatchDetails = lazy(() => import('../pages/patches/PatchDetails').then(m => ({ default: m.PatchDetails })));
const PatchRecommendations = lazy(() => import('../pages/patches/PatchRecommendations'));
const PatchTestApprove = lazy(() => import('../pages/patches/PatchTestApprove').then(m => ({ default: m.PatchTestApprove })));
const ZeroTouchDeployment = lazy(() => import('../pages/patches/ZeroTouchDeployment').then(m => ({ default: m.ZeroTouchDeployment })));
const PatchJobs = lazy(() => import('../pages/jobs/PatchJobs').then(m => ({ default: m.PatchJobs })));
const PatchJobsDeployed = lazy(() => import('../pages/jobs/PatchJobsDeployed').then(m => ({ default: m.PatchJobsDeployed })));

export const patchesRoutes = (
  <>
    <Route path="/patches" element={<ProtectedRoute><MainLayout><AllPatches /></MainLayout></ProtectedRoute>} />
    <Route path="/patch-recommendations" element={<ProtectedRoute><MainLayout><PatchRecommendations /></MainLayout></ProtectedRoute>} />
    <Route path="/patches/:id" element={<ProtectedRoute><MainLayout><PatchDetails /></MainLayout></ProtectedRoute>} />
    <Route path="/patches/deployed/*" element={<ProtectedRoute><MainLayout><PatchJobsDeployed /></MainLayout></ProtectedRoute>} />
    <Route path="/patches/test-approve" element={<ProtectedRoute><MainLayout><PatchTestApprove /></MainLayout></ProtectedRoute>} />
    <Route path="/patches/zero-touch" element={<ProtectedRoute><MainLayout><ZeroTouchDeployment /></MainLayout></ProtectedRoute>} />
    <Route path="/patches/patch-jobs" element={<ProtectedRoute><MainLayout><PatchJobs /></MainLayout></ProtectedRoute>} />
  </>
);
