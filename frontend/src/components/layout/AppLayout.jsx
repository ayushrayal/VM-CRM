import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const AppLayout = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
