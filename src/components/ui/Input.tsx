import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-2 w-full text-left">
      {label && <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</label>}
      <input
        className={`w-full px-4 py-3 bg-[#121216] border rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all duration-300 ${
          error ? 'border-brand' : 'border-gray-800 focus:border-brand'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-brand mt-1">{error}</span>}
    </div>
  );
};
