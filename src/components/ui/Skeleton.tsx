import React from 'react';
import { cn } from '@/src/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export default function Skeleton({ 
  className, 
  variant = 'rectangular' 
}: SkeletonProps) {
  return (
    <div className={cn(
      "animate-pulse bg-gray-200",
      variant === 'circular' && "rounded-full",
      variant === 'rectangular' && "rounded-xl",
      variant === 'text' && "h-4 w-full rounded",
      className
    )} />
  );
}
