import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Film,
  Calendar,
  Users,
  Tag,
  MessageSquare,
  Ticket,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building,
  Clapperboard,
  Database,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  setIsOpen,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Read current active tab from query parameters
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'movies', label: 'Phim', icon: Film },
    { id: 'cinemas', label: 'Rạp Chiếu', icon: Building },
    { id: 'showtimes', label: 'Lịch Chiếu', icon: Calendar },
    { id: 'bookings', label: 'Vé Đã Đặt', icon: Ticket },
    { id: 'users', label: 'Người Dùng', icon: Users },
    { id: 'promotions', label: 'Khuyến Mãi', icon: Tag },
    { id: 'reviews', label: 'Đánh Giá', icon: MessageSquare },
    { id: 'masterdata', label: 'Dữ Liệu Nguồn', icon: Database },
    { id: 'ticketprices', label: 'Quản Lý Giá Vé', icon: DollarSign },
  ];

  const handleMenuClick = (tabId: string) => {
    navigate(`/admin?tab=${tabId}`);
    setIsMobileOpen(false); // Close mobile drawer on click
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarVariants = {
    expanded: { width: '260px' },
    collapsed: { width: '80px' },
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Sidebar Wrapper */}
      <motion.aside
        initial="expanded"
        animate={isMobileOpen ? 'expanded' : isOpen ? 'expanded' : 'collapsed'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-[#0e0e12]/95 border-r border-white/5 backdrop-blur-xl transition-transform lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:flex'
        }`}
      >
        {/* Sidebar Header branding */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
                <Clapperboard size={18} className="text-white" />
              </div>
              {(isOpen || isMobileOpen) && (
                <span className="text-sm font-black tracking-widest text-white uppercase bg-clip-text">
                  CINEMA<span className="text-brand-gold">PASS</span>
                </span>
              )}
            </div>

            {/* Desktop Expand/Collapse toggle trigger */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="hidden lg:flex p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer border border-white/5"
            >
              {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-4 flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider relative group transition-all cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Active Highlight Glow Backdrop */}
                  {isActive && (
                    <motion.div
                      layoutId="activeAdminTabGlow"
                      className="absolute inset-0 bg-gradient-to-r from-brand/20 to-brand-gold/10 border border-brand/25 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Active brand indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/3 bottom-1/3 w-[3px] bg-brand rounded-r" />
                  )}

                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-brand' : 'text-gray-400 group-hover:text-white'
                    }`}
                  />
                  {(isOpen || isMobileOpen) && <span>{item.label}</span>}

                  {/* Tooltip on collapsed state */}
                  {!isOpen && !isMobileOpen && (
                    <div className="absolute left-20 hidden group-hover:block bg-[#16161c] border border-white/10 text-white text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer commands */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-brand hover:bg-brand/5 transition-all cursor-pointer group`}
          >
            <LogOut size={16} className="shrink-0 transition-colors" />
            {(isOpen || isMobileOpen) && <span>Đăng xuất</span>}

            {!isOpen && !isMobileOpen && (
              <div className="absolute left-20 hidden group-hover:block bg-[#16161c] border border-white/10 text-brand text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50">
                Đăng xuất
              </div>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
};
