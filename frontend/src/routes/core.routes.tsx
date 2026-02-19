import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { ProtectedRoute, PublicRoute } from '../components/ProtectedRoute';

const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('../pages/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const UserOnboarding = lazy(() => import('../pages/UserOnboarding').then(m => ({ default: m.UserOnboarding })));
const Notifications = lazy(() => import('../pages/Notifications').then(m => ({ default: m.Notifications })));
const Reports = lazy(() => import('../pages/Reports').then(m => ({ default: m.Reports })));
const CreateReport = lazy(() => import('../pages/reports/CreateReport').then(m => ({ default: m.CreateReport })));

export const coreRoutes = (
  <>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/onboarding" element={<PublicRoute><UserOnboarding /></PublicRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><MainLayout><Reports /></MainLayout></ProtectedRoute>} />
    <Route path="/reports/create" element={<ProtectedRoute><MainLayout><CreateReport /></MainLayout></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><MainLayout><Notifications /></MainLayout></ProtectedRoute>} />
    <Route path="/" element={<Navigate to="/login" replace />} />
  </>
);
