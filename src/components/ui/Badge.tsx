import React from 'react';
import { cn } from '@/src/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export default function Badge({ 
  children, 
  variant = 'primary', 
  className 
}: BadgeProps) {
  const variants = {
    primary: 'bg-blue-50 text-blue-700 border-blue-100',
    secondary: 'bg-gray-50 text-gray-700 border-gray-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    danger: 'bg-red-50 text-red-700 border-red-100',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
