import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { UserProfile } from '@/src/types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-[100dvh] bg-gray-50 flex overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        role={user?.role || 'user'} 
        onLogout={onLogout}
      />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 h-full">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
