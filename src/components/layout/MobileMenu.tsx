import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Ticket, Search, Film, Gift, MapPin, Award } from 'lucide-react';
import type { User } from '../../types';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user: User | null;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  user,
  onLogout,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Trang Chủ', path: '/', icon: Film },
    { name: 'Phim', path: '/movies', icon: Film },
    { name: 'Rạp Chiếu', path: '/he-thong-rap', icon: MapPin },
    { name: 'Khuyến Mãi', path: '/promotions', icon: Gift },
    { name: 'Vé Của Tôi', path: '/my-bookings', icon: Ticket, authRequired: true },
  ];

  const menuVariants = {
    closed: {
      opacity: 0,
      y: -20,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
        when: 'afterChildren',
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    closed: { opacity: 0, x: -10 },
    open: { opacity: 1, x: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="closed"
          animate="open"
          exit="closed"
          variants={menuVariants}
          className="fixed inset-0 top-[72px] z-30 bg-[#070709] border-t border-white/5 flex flex-col md:hidden px-6 py-8 overflow-y-auto select-none"
        >
          {/* Mobile Search Bar */}
          <motion.form
            variants={itemVariants}
            onSubmit={(e) => {
              onSearchSubmit(e);
              onClose();
            }}
            className="relative w-full mb-8"
          >
            <input
              type="text"
              placeholder="Tìm kiếm phim, thể loại..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#121216] border border-white/10 rounded-xl px-4 py-3 pl-11 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/40 transition-all font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          </motion.form>

          {/* Navigation Links */}
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => {
              if (link.authRequired && !isAuthenticated) return null;
              const Icon = link.icon;
              const active = location.pathname === link.path;

              const handleScrollToHash = (e: React.MouseEvent) => {
                onClose();
                if (link.path.startsWith('/#') && location.pathname === '/') {
                  e.preventDefault();
                  const id = link.path.substring(2);
                  const element = document.getElementById(id);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                  window.history.pushState(null, '', link.path);
                }
              };

              return (
                <motion.div key={link.path} variants={itemVariants}>
                  <Link
                    to={link.path}
                    onClick={handleScrollToHash}
                    className={`flex items-center gap-4 text-base font-bold tracking-wide transition-all ${
                      active
                        ? 'text-brand-gold shadow-[0_0_10px_rgba(229,169,59,0.1)]'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl border transition-colors ${
                        active
                          ? 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold'
                          : 'bg-white/5 border-white/5 text-gray-400'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    {link.name}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Authentication section */}
          <div className="mt-auto border-t border-white/5 pt-8 flex flex-col gap-4">
            {isAuthenticated && user ? (
              <motion.div variants={itemVariants} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-4 rounded-2xl">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="h-10 w-10 rounded-full border border-brand-gold/30 object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-brand to-brand-gold text-black font-extrabold flex items-center justify-center text-xs tracking-wider border border-white/10 flex-shrink-0">
                      {user.fullName.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase()}
                    </div>
                  )}
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-black text-white truncate">{user.fullName}</p>
                    <p className="text-xs text-brand-gold font-mono flex items-center gap-1 mt-0.5">
                      <Award size={10} />
                      Thành viên • {user.membershipPoints} điểm
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand font-bold py-3.5 rounded-xl transition-all"
                >
                  <LogOut size={16} />
                  Đăng Xuất
                </button>
              </motion.div>
            ) : (
              <motion.div variants={itemVariants} className="flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={onClose}
                  className="w-full text-center text-sm font-bold text-gray-300 hover:text-white py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  onClick={onClose}
                  className="w-full text-center text-sm font-bold bg-brand hover:bg-brand-hover text-white py-3.5 rounded-xl transition-all shadow-lg shadow-brand/25"
                >
                  Tạo Tài Khoản
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
