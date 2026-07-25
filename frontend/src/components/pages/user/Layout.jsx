// Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet /> {/* Child routes render here without unmounting Navbar */}
      </main>
    </>
  );
}