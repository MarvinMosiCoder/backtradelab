// SidebarContext.js
import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

const isDesktopViewport = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

export const SidebarProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktopViewport);

  const toggleSidebar = (nextValue) => {
    setIsSidebarOpen((prev) => typeof nextValue === 'boolean' ? nextValue : !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar, openSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Custom hook to use Sidebar context
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
