import React from 'react';
import { cn } from '@/src/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'flat';
}

export default function Card({ 
  children, 
  className, 
  title, 
  description, 
  footer,
  headerAction,
  onClick,
  variant = 'default'
}: CardProps) {
  const variants = {
    default: "bg-white border-slate-200/60 shadow-sm",
    glass: "bg-white/70 backdrop-blur-md border-white/20 shadow-xl shadow-slate-200/40",
    flat: "bg-slate-50/50 border-slate-200/40 shadow-none"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-[24px] border transition-all duration-300 flex flex-col",
        variants[variant],
        onClick && "cursor-pointer hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5",
        className
      )}
    >
      {(title || description || headerAction) && (
        <div className="px-6 py-5 border-b border-slate-100/60 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h3>}
            {description && <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      
      <div className="flex-1 p-6">
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100/60">
          {footer}
        </div>
      )}
    </div>
  );
}
