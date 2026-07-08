import React from 'react'
import { Route } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import Upload from '../components/pages/user/Upload'
import MyDocument from '../components/pages/user/MyDocument'
import DocumentDetails from '../components/pages/user/DocumentDetails'
import UserProfile from '../components/pages/user/UserProfile'
import Pricing from '../components/pages/user/Pricing'
import PaymentHistory from '../components/pages/user/PaymentHistory'
import PaymentDetails from '../components/pages/user/PaymentDetails'
import SubscriptionManagement from '../components/pages/user/SubscriptionManagement'
import UserDashboard from '../components/pages/user/UserDashboard'
import AccountSettings from '../components/pages/user/AccountSettings'

function UserRoute() {
  return (
    <>
      {/* 🔒 CLIENT PORTAL PATHS (Strictly protected from Admins using allowedRoles) */}
          <Route path="/user-dashboard" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <UserDashboard/>
              </ProtectedRoute>
            }
          />
          <Route path='/upload' element={
              <ProtectedRoute allowedRoles={['USER']}>
                <Upload/>
              </ProtectedRoute>
            }
          />
          <Route path='/documents' element={
              <ProtectedRoute allowedRoles={['USER']}>
                <MyDocument/>
              </ProtectedRoute>
            }
          />
          <Route path="/documents/:id" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <DocumentDetails/>
              </ProtectedRoute>
            } 
          />
          <Route path='/profile' element={
              <ProtectedRoute allowedRoles={['USER']}>
                <UserProfile/>
              </ProtectedRoute>
            }
          />
          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={['USER']}>
                <Notification/>
              </ProtectedRoute>
            }            
          />

          <Route path="/pricing" element={
            <ProtectedRoute allowedRoles={['USER']}>
                <Pricing/>
              </ProtectedRoute>
            }            
          />

          <Route path="/payment-history" element={
            <ProtectedRoute allowedRoles={['USER']}>
                <PaymentHistory/>
              </ProtectedRoute>
            }            
          />

          <Route path="/payments/:id" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <PaymentDetails />
              </ProtectedRoute>
            } 
          />

          <Route path="/subscription" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <SubscriptionManagement />
              </ProtectedRoute>
            } 
          />

          <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <AccountSettings />
              </ProtectedRoute>
            } 
          />
    </>
  )
}

export default UserRoute