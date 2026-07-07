import React from 'react'
import { Route } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import AdminDashboard from '../components/pages/admin/AdminDashboard'
import AllDocuments from '../components/pages/admin/AllDocuments'
import AdminDocumentDetails from '../components/pages/admin/AdminDocumentDetails'
import AllUsers from '../components/pages/admin/AllUsers'
import UserDetails from '../components/pages/admin/UserDetails'

function AdminRoute() {
  return (
    <>
          <Route path='/admin-dashboard' element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard/>
              </ProtectedRoute>
            }
          />

          <Route path='/all-documents' element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AllDocuments/>
              </ProtectedRoute>
            }
          />

          <Route path='/admin/documents/:id' element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDocumentDetails/>
              </ProtectedRoute>
            }
          />

          <Route path='/all-users' element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AllUsers/>
              </ProtectedRoute>
            }
          />

          <Route path='admin/users/:id' element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <UserDetails/>
              </ProtectedRoute>
            }
          />
    </>
  )
}

export default AdminRoute
