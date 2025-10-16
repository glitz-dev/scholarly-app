'use client'
import React from 'react';
import Navbar from '@/components/User/Navbar';


const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-gray-800 dark:text-white relative ">
        {children}
        </main>
    </div>
  );
};

export default Layout;