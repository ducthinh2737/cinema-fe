import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogOut, Ticket, ShieldAlert, Award } from 'lucide-react';
import type { User } from '../../types';

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
  onClose: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ user, onLogout, onClose }) => {
  const isAdmin = user.roles?.includes('Admin');

  // Extract initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute right-0 mt-3 w-72 bg-[#0f0f12]/95 border border-white/10 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden z-50"
    >
      {/* User Info Section */}
      <Link
        to="/profile"
        onClick={onClose}
        className="p-5 border-b border-white/5 bg-white/[0.02] hover:bg-white/[0.04] flex items-center gap-3 transition-colors block text-left"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-10 w-10 rounded-full border border-brand-gold/30 object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-brand to-brand-gold text-black font-extrabold flex items-center justify-center text-xs tracking-wider border border-white/10">
            {getInitials(user.fullName)}
          </div>
        )}

        <div className="flex-grow min-w-0">
          <p className="text-sm font-black text-white truncate hover:text-brand transition-colors">{user.fullName}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
      </Link>

      {/* Member Rank Display */}
      <div className="px-5 py-2.5 bg-gradient-to-r from-brand-gold/10 via-brand-gold/5 to-transparent flex items-center justify-between border-b border-white/5">
        <span className="text-[10px] text-brand-gold uppercase tracking-widest font-black flex items-center gap-1.5">
          <Award size={12} className="stroke-[2.5]" />
          Thành viên VIP
        </span>
        <span className="text-xs font-bold text-white font-mono bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
          {user.membershipPoints} điểm
        </span>
      </div>

      {/* Dropdown Options */}
      <div className="p-2 flex flex-col gap-1">
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-bold transition-all border border-transparent hover:border-red-500/20"
          >
            <ShieldAlert size={14} className="animate-pulse" />
            Trang Quản Trị
          </Link>
        )}

        <Link
          to="/my-bookings"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white text-xs font-semibold transition-all"
        >
          <Ticket size={14} className="text-brand-gold" />
          Vé Của Tôi
        </Link>

        <div className="h-[1px] bg-white/5 my-1" />

        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-brand/10 text-gray-400 hover:text-brand text-xs font-bold transition-all text-left"
        >
          <LogOut size={14} />
          Đăng Xuất
        </button>
      </div>

      {/* Bottom glowing line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
    </motion.div>
  );
};
