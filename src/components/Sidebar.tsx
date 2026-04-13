import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bell, 
  FileText, 
  Image as ImageIcon, 
  FolderOpen, 
  Search, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ROUTES, APP_NAME } from '@/src/constants';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: 'owner' | 'admin' | 'user';
  onLogout: () => void;
}

export default function Sidebar({ isOpen, setIsOpen, role, onLogout }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems: { name: string; path: string; icon: any }[] = [
    { name: '대시보드', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { name: '공지사항', path: ROUTES.NOTICES, icon: Bell },
    { name: '회의록', path: ROUTES.MEETINGS, icon: FileText },
    { name: '도면 게시판', path: ROUTES.DRAWINGS, icon: ImageIcon },
    { name: '자료실', path: ROUTES.RESOURCES, icon: FolderOpen },
    { name: '내규/사규 검색', path: ROUTES.REGULATIONS, icon: Search },
  ];

  if (role === 'owner' || role === 'admin') {
    menuItems.push({ name: '시스템 관리', path: ROUTES.ADMIN, icon: Settings });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-slate-900 text-slate-300 z-50 transition-transform duration-500 ease-in-out transform lg:translate-x-0 border-r border-slate-800/50",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Logo */}
          <div className="p-6 flex items-center justify-between relative z-10">
            <Link to={ROUTES.DASHBOARD} className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
              <div className="w-9 h-9 bg-indigo-500 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 rotate-3 group-hover:rotate-0 transition-transform">
                G
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white tracking-tighter text-base leading-tight">{APP_NAME}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Civil Engineering</span>
              </div>
            </Link>
            <button className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setIsOpen(false)}>
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 relative z-10 no-scrollbar">
            <div className="px-4 mb-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Menu</span>
            </div>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/20" 
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3.5 relative z-10">
                    <item.icon className={cn(
                      "w-5 h-5 transition-colors duration-300",
                      isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                    )} />
                    <span className="font-bold text-sm tracking-tight">{item.name}</span>
                  </div>
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute inset-0 bg-indigo-600 z-0"
                    />
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 relative z-10 opacity-50" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800/50 relative z-10">
            <button 
              onClick={onLogout}
              className="flex items-center gap-3.5 w-full px-4 py-3.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-2xl transition-all duration-300 group"
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-sm tracking-tight">시스템 로그아웃</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
