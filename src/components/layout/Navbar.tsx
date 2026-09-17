import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Menu, X, Ticket, Film, Gift, MapPin } from 'lucide-react';
import { UserDropdown } from './UserDropdown';
import { getImageUrl } from '../../api/client';
import { NotificationDropdown } from './NotificationDropdown';
import { MobileMenu } from './MobileMenu';
import type { User, Notification } from '../../types';

interface NavbarProps {
  user: User | null;
  isAuthenticated: boolean;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isAuthenticated,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  hasMore,
  loadingMore,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'user' | 'notif' | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor scroll for header background styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchExpanded(false);
    }
  };

  const toggleDropdown = (type: 'user' | 'notif') => {
    setActiveDropdown((prev) => (prev === type ? null : type));
  };

  const navLinks = [
    { name: 'Trang Chủ', path: '/', icon: Film },
    { name: 'Phim', path: '/movies', icon: Film },
    { name: 'Rạp Chiếu', path: '/he-thong-rap', icon: MapPin },
    { name: 'Khuyến Mãi', path: '/promotions', icon: Gift },
    { name: 'Vé Của Tôi', path: '/my-bookings', icon: Ticket, authRequired: true },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-500 border-b select-none ${
          isScrolled
            ? 'bg-[#070709]/80 backdrop-blur-xl border-white/5 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
            : 'bg-transparent border-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 relative group z-50">
            <span className="text-xl md:text-2xl font-extrabold tracking-wider bg-gradient-to-r from-brand to-brand-gold bg-clip-text text-transparent group-hover:scale-105 transition-all duration-300">
              CINEMAPASS
            </span>
            <div className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-brand to-brand-gold group-hover:w-full transition-all duration-300" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              if (link.authRequired && !isAuthenticated) return null;
              const active = location.pathname === link.path;

              const handleScrollToHash = (e: React.MouseEvent) => {
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
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={handleScrollToHash}
                  className={`relative text-xs font-bold uppercase tracking-wider transition-colors py-2 px-1 ${
                    active ? 'text-brand-gold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.name}
                  {active && (
                    <motion.div
                      layoutId="activeUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand to-brand-gold shadow-[0_0_10px_rgba(229,169,59,0.5)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action options */}
          <div className="flex items-center gap-4 md:gap-5 z-50" ref={dropdownRef}>
            {/* Desktop Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative">
              <AnimatePresence>
                {isSearchExpanded && (
                  <motion.input
                    ref={searchInputRef}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 180, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    type="text"
                    placeholder="Tìm kiếm phim..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#121216]/90 border border-white/10 rounded-full px-4 py-1.5 pr-8 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/40 transition-all mr-2"
                  />
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => {
                  if (isSearchExpanded && searchQuery.trim()) {
                    handleSearchSubmit({ preventDefault: () => {} } as React.FormEvent);
                  } else {
                    setIsSearchExpanded(!isSearchExpanded);
                  }
                }}
                className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <Search size={16} />
              </button>
            </form>

            {isAuthenticated ? (
              <>
                {/* Notification trigger */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('notif')}
                    className={`p-2.5 rounded-full hover:bg-white/5 transition-colors relative cursor-pointer ${
                      activeDropdown === 'notif' ? 'bg-white/5 text-brand-gold' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Bell size={17} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-brand text-[9px] font-black text-white h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-[#070709] animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {activeDropdown === 'notif' && (
                      <NotificationDropdown
                        notifications={notifications}
                        onMarkAsRead={onMarkAsRead}
                        onMarkAllAsRead={onMarkAllAsRead}
                        onLoadMore={onLoadMore}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* User Dropdown trigger */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('user')}
                    className="flex items-center gap-1 cursor-pointer focus:outline-none group"
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={getImageUrl(user.avatarUrl)}
                        alt={user.fullName}
                        className="h-8 w-8 rounded-full border border-white/10 group-hover:border-brand-gold/50 transition-colors object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand to-brand-gold text-black font-extrabold flex items-center justify-center text-[10px] tracking-wider border border-white/15 group-hover:shadow-[0_0_10px_rgba(229,169,59,0.3)] transition-all">
                        {user?.fullName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {activeDropdown === 'user' && user && (
                      <UserDropdown
                        user={user}
                        onLogout={onLogout}
                        onClose={() => setActiveDropdown(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-xs font-extrabold uppercase tracking-widest text-gray-400 hover:text-white px-3 py-2 transition-colors"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-brand text-xs font-bold uppercase tracking-wider text-white px-5 py-2.5 rounded-xl hover:bg-brand-hover transition-all shadow-md shadow-brand/20 hover:shadow-brand/40 hover:-translate-y-0.5"
                >
                  Đăng Ký
                </Link>
              </div>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Staggered Slide down Menu */}
      <MobileMenu
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />
    </>
  );
};
