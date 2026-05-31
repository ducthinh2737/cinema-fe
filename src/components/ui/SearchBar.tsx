import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Tìm phim, thể loại, ngôn ngữ...',
}) => {
  return (
    <div className="relative w-full max-w-md">
      <span className="absolute inset-y-0 left-4 flex items-center text-gray-500">
        <Search size={18} />
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-12 py-3.5 bg-[#121216]/80 backdrop-blur-md border border-white/5 rounded-2xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/20 transition-all shadow-glass"
      />
      <button className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white transition-colors">
        <SlidersHorizontal size={16} />
      </button>
    </div>
  );
};
