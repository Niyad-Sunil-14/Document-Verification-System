import { useState } from 'react'
import Login from './components/auth/Login'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from './components/auth/Register';
import AdminLogin from './components/auth/AdminLogin';
import Dashboard from './components/pages/user/Dashboard';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import ForgotPassword from './components/auth/ForgotPassword';
import ProtectedRoute from './routes/ProtectedRoute';
import Home from './components/pages/Home';
import Upload from './components/pages/user/Upload';
import MyDocument from './components/pages/user/MyDocument';
import DocumentDetails from './components/pages/user/DocumentDetails';
import UserProfile from './components/pages/user/UserProfile';
import GuestRoutes from './routes/GuestRoute';
import RegisterOTP from './components/auth/RegisterOTP';
import AllDocuments from './components/pages/admin/AllDocuments';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* GUEST-ONLY ROUTES */}
          <Route element={<GuestRoutes />}>
            <Route path='/admin-login' element={<AdminLogin/>}/>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register/>} />
            <Route path='/forgot-password' element={<ForgotPassword/>}/>
            <Route path='/verify-registration' element={<RegisterOTP/>}/>
          </Route>


          {/* 🔒 ADMINISTRATIVE PANELS */}
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


          {/* 🔒 CLIENT PORTAL PATHS (Strictly protected from Admins using allowedRoles) */}
          <Route path="/user-dashboard" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <Dashboard/>
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

        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App