import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  variant = 'rect',
}) => {
  const base = 'bg-gray-800/40 animate-pulse';
  
  const variants = {
    text: 'h-4 w-3/4 rounded',
    rect: 'h-32 w-full rounded-xl',
    circle: 'h-12 w-12 rounded-full',
  };

  return <div className={`${base} ${variants[variant]} ${className}`} />;
};
