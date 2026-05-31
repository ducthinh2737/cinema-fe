import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Sliders,
  Home,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminTopbarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const adminNotifications = [
    { id: 1, title: 'Đã hoàn thành sao lưu máy chủ', time: '10 phút trước', desc: 'Tự động lưu và đồng bộ hóa nhật ký giao dịch cơ sở dữ liệu.', type: 'info' },
    { id: 2, title: 'Sự kiện khóa ghế mới', time: '1 giờ trước', desc: 'Ghế phòng chiếu IMAX 3 được đặt bởi người dùng #124.', type: 'alert' },
    { id: 3, title: 'Phản hồi cổng thanh toán', time: '3 giờ trước', desc: 'Giao dịch VNPay #8942918 đã xác nhận.', type: 'success' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-white/5 bg-[#0e0e12]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 select-none">
      {/* Left section: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="lg:hidden p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer border border-white/5"
        >
          <Menu size={16} />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
          <span>Trang Quản Trị</span>
          <span className="text-gray-700">/</span>
          <span className="text-brand-gold">Bảng Điều Khiển</span>
        </div>
      </div>

      {/* Right section: System statuses, Notifications, Profile card */}
      <div className="flex items-center gap-4">
        
        {/* Connection health check status */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[10px] font-black uppercase tracking-wider">
          <ShieldCheck size={12} />
          <span>Hệ thống ổn định</span>
        </div>

        {/* Storefront Home trigger */}
        <Link
          to="/"
          className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5"
          title="Về Trang Khách Hàng"
        >
          <Home size={16} />
        </Link>

        {/* Administrative Notifications panel */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5 relative cursor-pointer"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand shadow-md shadow-brand/40 animate-pulse" />
          </button>

          <AnimatePresence>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3.5 w-80 bg-[#121217] border border-white/10 rounded-2xl p-4 shadow-2xl z-40 text-left backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
                    <span className="text-xs font-black uppercase tracking-widest text-white">Cảnh báo hệ thống</span>
                    <span className="text-[9px] bg-brand/10 border border-brand/20 text-brand px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      3 hoạt động
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                    {adminNotifications.map((notif) => (
                      <div key={notif.id} className="p-2.5 hover:bg-white/5 rounded-xl border border-white/[0.02] flex flex-col gap-0.5 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white leading-none">{notif.title}</span>
                          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">{notif.time}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 leading-normal">{notif.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* System Admin Settings profile dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-xl border border-white/5 transition-all text-gray-400 hover:text-white cursor-pointer"
          >
            <div className="h-7 w-7 rounded-lg bg-brand-gold/15 border border-brand-gold/20 flex items-center justify-center font-black text-brand-gold text-xs uppercase shadow-sm">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <span className="hidden md:block text-xs font-bold text-gray-300 group-hover:text-white select-none">
              {user?.fullName || 'SysAdmin'}
            </span>
            <ChevronDown size={14} className="opacity-70" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3.5 w-56 bg-[#121217] border border-white/10 rounded-2xl p-3 shadow-2xl z-40 text-left backdrop-blur-xl"
                >
                  <div className="px-3 py-2 border-b border-white/5 mb-2">
                    <span className="text-xs font-black text-white block uppercase truncate">{user?.fullName || 'Admin User'}</span>
                    <span className="text-[10px] text-gray-500 block truncate mt-0.5">{user?.email || 'admin@cinemapass.com'}</span>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                  >
                    <User size={14} className="text-brand-gold" /> Thông tin cá nhân
                  </Link>

                  <Link
                    to="/admin?tab=dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                  >
                    <Sliders size={14} className="text-brand-gold" /> Trang quản trị
                  </Link>

                  <div className="h-[1px] bg-white/5 my-2" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-400 hover:text-brand rounded-xl hover:bg-brand/5 transition-all cursor-pointer"
                  >
                    <LogOut size={14} /> Đăng xuất hệ thống
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
};
