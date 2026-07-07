import React from 'react'
import { Route } from 'react-router'
import Home from '../components/pages/Home'
import GuestRoutes from './GuestRoute'
import AdminLogin from '../components/auth/AdminLogin'
import Login from '../components/auth/Login'
import Register from '../components/auth/Register'
import ForgotPassword from '../components/auth/ForgotPassword'
import RegisterOTP from '../components/auth/RegisterOTP'

function CommonRoute() {
  return (
    <>
      <Route path="/" element={<Home />} />

        {/* GUEST-ONLY ROUTES */}
        <Route element={<GuestRoutes />}>
        <Route path='/admin-login' element={<AdminLogin/>}/>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register/>} />
        <Route path='/forgot-password' element={<ForgotPassword/>}/>
        <Route path='/verify-registration' element={<RegisterOTP/>}/>
        </Route>
    </>
  )
}

export default CommonRoute
