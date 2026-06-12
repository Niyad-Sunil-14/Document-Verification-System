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

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path='/admin-login' element={<AdminLogin/>}/>

          {/* GUEST-ONLY ROUTES (Logged-in users CANNOT access these) */}
          <Route element={<GuestRoutes />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register/>} />
            <Route path='/forgot-password' element={<ForgotPassword/>}/>
            <Route path='/verify-registration' element={<RegisterOTP/>}/>
          </Route>
              


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
          <Route path='/documents' element={
              <ProtectedRoute>
                <MyDocument/>
              </ProtectedRoute>
            }
          />
          <Route path="/documents/:id" element={
            <ProtectedRoute>
              <DocumentDetails/>
            </ProtectedRoute>
          } 
          />
          <Route path='/profile' element={
              <ProtectedRoute>
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
