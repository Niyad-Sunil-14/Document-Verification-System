import { useState } from 'react'
import Login from './components/auth/Login'
import Dashboard from './components/pages/Dashboard'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from './components/auth/Register';

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register/>} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
