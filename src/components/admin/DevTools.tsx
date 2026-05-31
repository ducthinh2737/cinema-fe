import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  RefreshCw, 
  UserCheck, 
  Copy, 
  X, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import type { AuthResponse } from '../../types';

export const DevTools: React.FC = () => {
  const { login, logout, user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const testAccounts = [
    {
      role: 'Admin (Quản trị)',
      email: 'admin@gmail.com',
      password: 'Password123',
      desc: 'Quản lý phim, rạp chiếu, lịch và chương trình khuyến mãi.'
    },
    {
      role: 'User (Khách hàng)',
      email: 'user@gmail.com',
      password: 'Password123',
      desc: 'Đặt vé xem phim, giữ ghế thời gian thực, xem vé và thông báo.'
    }
  ];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}!`, 'info');
  };

  const handleAutoLogin = async (email: string) => {
    try {
      showToast('Đang đăng nhập tự động...', 'info');
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password: 'Password123'
      });
      login(response.data);
      showToast('Đăng nhập thành công!', 'success');
      setIsOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Đăng nhập tự động thất bại.';
      showToast(msg, 'error');
    }
  };

  const handleResetDatabase = async () => {
    if (isResetting) return;
    setIsResetting(true);
    showToast('Đang thiết lập lại toàn bộ cơ sở dữ liệu...', 'info');
    try {
      const response = await apiClient.post('/test/reset');
      showToast(response.data.Message || 'Đã làm sạch và khôi phục dữ liệu mẫu thành công!', 'success');
      logout(); // Logout to refresh session
    } catch (err: any) {
      showToast('Có lỗi xảy ra khi khôi phục cơ sở dữ liệu.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      {/* Floating Gear Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-3.5 bg-brand text-white rounded-full shadow-lg shadow-brand/35 cursor-pointer flex items-center justify-center border border-white/10"
          title="Công cụ thử nghiệm"
        >
          <Settings size={20} className="animate-spin-slow" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Sidebar Drawler */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-85 bg-[#0c0c10] border-l border-white/5 shadow-2xl z-50 flex flex-col p-6 overflow-y-auto select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-gold animate-pulse" />
                  <span className="text-sm font-black uppercase tracking-wider text-white">Bảng Thử Nghiệm (Dev)</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Reset Data Section */}
              <div className="bg-brand/5 border border-brand/10 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Khôi Phục Dữ Liệu Sạch</h4>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                      Làm sạch toàn bộ lịch sử đặt vé cũ, hủy giữ ghế, và tái thiết lập danh sách phim, suất chiếu và ghế ngồi ban đầu.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetDatabase}
                  disabled={isResetting}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-brand hover:bg-brand/85 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-brand/15"
                >
                  <RefreshCw size={14} className={isResetting ? 'animate-spin' : ''} />
                  {isResetting ? 'Đang làm sạch dữ liệu...' : 'Làm mới & Seed database'}
                </button>
              </div>

              {/* Login Credentials Accounts */}
              <div className="flex flex-col gap-4 mb-6">
                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Tài khoản đăng nhập có sẵn
                </h4>

                {testAccounts.map((acc, index) => (
                  <div key={index} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-brand-gold">{acc.role}</span>
                      <button
                        onClick={() => handleAutoLogin(acc.email)}
                        className="text-[10px] bg-white/5 border border-white/10 hover:bg-brand hover:border-brand/20 text-gray-300 hover:text-white px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <UserCheck size={11} /> Đăng nhập
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-400 leading-normal">{acc.desc}</p>

                    <div className="grid grid-cols-1 gap-1.5 mt-1 border-t border-white/5 pt-2 text-[10px]">
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="font-mono">{acc.email}</span>
                        <button
                          onClick={() => handleCopy(acc.email, 'Email')}
                          className="p-1 hover:bg-white/5 text-gray-500 hover:text-white rounded-md transition-all cursor-pointer"
                          title="Sao chép Email"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="font-mono">Mật khẩu: {acc.password}</span>
                        <button
                          onClick={() => handleCopy(acc.password, 'Mật khẩu')}
                          className="p-1 hover:bg-white/5 text-gray-500 hover:text-white rounded-md transition-all cursor-pointer"
                          title="Sao chép Mật khẩu"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Copy Section */}
              <div className="flex flex-col gap-2 mb-6">
                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Mã giảm giá để test thanh toán
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col items-center text-center justify-center gap-1.5">
                    <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">GIAMGIA10</span>
                    <span className="text-[9px] text-gray-400">Giảm 10% tổng vé</span>
                    <button
                      onClick={() => handleCopy('GIAMGIA10', 'mã GIAMGIA10')}
                      className="text-[9px] text-gray-500 hover:text-brand-gold font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy size={9} /> Copy mã
                    </button>
                  </div>
                  <div className="p-2.5 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col items-center text-center justify-center gap-1.5">
                    <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">KM50K</span>
                    <span className="text-[9px] text-gray-400">Giảm 50.000đ vé</span>
                    <button
                      onClick={() => handleCopy('KM50K', 'mã KM50K')}
                      className="text-[9px] text-gray-500 hover:text-brand-gold font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy size={9} /> Copy mã
                    </button>
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-1 text-[9px] text-gray-500 font-medium">
                <div>Trạng thái: {isAuthenticated ? `Đã đăng nhập (${user?.fullName})` : 'Chưa đăng nhập'}</div>
                <div>Server API: http://localhost:5156</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
