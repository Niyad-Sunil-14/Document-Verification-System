import { useState } from 'react'
import Login from './components/auth/Login'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from './components/auth/Register';
import AdminLogin from './components/auth/AdminLogin';
import Dashboard from './components/pages/user/Dashboard';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import ForgotPassword from './components/auth/ForgotPassword';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register/>} />
          <Route path='/admin-login' element={<AdminLogin/>}/>
          <Route path='/forgot-password' element={<ForgotPassword/>}/>



          <Route path="/user-dashboard" element={
              <ProtectedRoute>
                <Dashboard/>
              </ProtectedRoute>
            }
          />
          <Route path='/admin-dashboard' element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard/>
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
