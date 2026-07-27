import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/pages/user/Layout';

// Dynamic Lazy Imports
const UserDashboard = lazy(() => import('../components/pages/user/UserDashboard'));
const Upload = lazy(() => import('../components/pages/user/Upload'));
const MyDocument = lazy(() => import('../components/pages/user/MyDocument'));
const DocumentDetails = lazy(() => import('../components/pages/user/DocumentDetails'));
const UserProfile = lazy(() => import('../components/pages/user/UserProfile'));
const Pricing = lazy(() => import('../components/pages/user/Pricing'));
const PaymentHistory = lazy(() => import('../components/pages/user/PaymentHistory'));
const PaymentDetails = lazy(() => import('../components/pages/user/PaymentDetails'));
const SubscriptionManagement = lazy(() => import('../components/pages/user/SubscriptionManagement'));
const AccountSettings = lazy(() => import('../components/pages/user/AccountSettings'));
const NotificationsPage = lazy(() => import('../components/pages/user/Notification'));
const Support = lazy(() => import('../components/pages/user/Support'));

function UserRoute() {
  return (
    <Route element={<Layout />}>
      <Route path="/user-dashboard" element={<ProtectedRoute allowedRoles={['USER']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute allowedRoles={['USER']}><Upload /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute allowedRoles={['USER']}><MyDocument /></ProtectedRoute>} />
      <Route path="/documents/:id" element={<ProtectedRoute allowedRoles={['USER']}><DocumentDetails /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={['USER']}><UserProfile /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute allowedRoles={['USER']}><NotificationsPage /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute allowedRoles={['USER']}><Pricing /></ProtectedRoute>} />
      <Route path="/payment-history" element={<ProtectedRoute allowedRoles={['USER']}><PaymentHistory /></ProtectedRoute>} />
      <Route path="/payments/:id" element={<ProtectedRoute allowedRoles={['USER']}><PaymentDetails /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute allowedRoles={['USER']}><SubscriptionManagement /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['USER']}><AccountSettings /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute allowedRoles={['USER']}><Support /></ProtectedRoute>} />
    </Route>
  );
}

export default UserRoute;