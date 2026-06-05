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

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register/>} />
          <Route path='/admin-login' element={<AdminLogin/>}/>
          <Route path='/forgot-password' element={<ForgotPassword/>}/>
          


          <Route path='/admin-dashboard' element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard/>
              </ProtectedRoute>
            }
          />
          <Route path="/user-dashboard" element={
              <ProtectedRoute>
                <Dashboard/>
              </ProtectedRoute>
            }
          />
          <Route path='/upload' element={
              <ProtectedRoute>
                <Upload/>
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
