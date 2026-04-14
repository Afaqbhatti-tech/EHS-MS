import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex w-full max-w-full h-dvh bg-canvas overflow-hidden" style={{ height: '100dvh' }}>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onToggleSidebar={toggleSidebar} />
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8">
          <main className="main-scroll-area h-full overflow-y-auto overflow-x-hidden py-4 sm:py-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
