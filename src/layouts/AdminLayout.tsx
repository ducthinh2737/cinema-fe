import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTopbar } from '../components/admin/AdminTopbar';

export const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Security Check: Verify Admin Access
  useEffect(() => {
    if (!user || !user.roles?.includes('Admin')) {
      showToast('Từ chối truy cập. Yêu cầu quyền quản trị viên.', 'error');
      navigate('/');
    }
  }, [user, navigate, showToast]);

  if (!user || !user.roles?.includes('Admin')) {
    return null; // Return null while redirecting
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-100 flex overflow-hidden">
      {/* Dynamic Left Sidebar Drawer */}
      <AdminSidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Right Side Viewport Wrapper */}
      <div
        className="flex-grow flex flex-col min-w-0 transition-all duration-300"
        style={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth < 1024
            ? '0px'
            : sidebarOpen
            ? '260px'
            : '80px'
        }}
      >
        {/* Unified Administrative Top Header Bar */}
        <AdminTopbar
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Dynamic Nested Content Screen Area */}
        <main className="flex-grow overflow-y-auto px-4 md:px-8 py-8 relative">
          {/* Subtle Background Glow Elements */}
          <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none -z-10" />
          
          <Outlet />
        </main>
      </div>
    </div>
  );
};
