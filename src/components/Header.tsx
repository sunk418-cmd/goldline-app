import React from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { UserProfile } from '@/src/types';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/70 backdrop-blur-xl border-b border-slate-200/50 h-20 flex items-center px-6 lg:px-10 justify-between">
      <div className="flex items-center gap-6">
        <button 
          onClick={onMenuClick}
          className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden lg:flex items-center gap-3 bg-slate-100/50 px-4 py-2.5 rounded-2xl border border-slate-200/30 focus-within:bg-white focus-within:border-indigo-500/30 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all duration-300">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="시스템 통합 검색..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-72 text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-8">
        <div className="flex items-center gap-2">
          <button className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-xl relative transition-all duration-300">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white" />
          </button>
        </div>
        
        <div className="h-10 w-px bg-slate-200/60 hidden sm:block" />

        <div className="flex items-center gap-3 cursor-default">
          <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-xl shadow-amber-500/30 border-2 border-white">
            <span className="text-white font-black text-xl italic tracking-tighter pr-0.5">G</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-black text-slate-900 tracking-tight">김포골드라인</span>
            <span className="text-[10px] text-amber-600 font-extrabold tracking-widest mt-0.5 uppercase">Gimpo Goldline</span>
          </div>
        </div>
      </div>
    </header>
  );
}
