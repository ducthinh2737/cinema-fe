import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  ChevronUp,
  LogOut,
  Building,
  Clapperboard,
  Database,
  DollarSign,
  Tv,
  Grid,
  Newspaper,
  Coffee
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
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

  // State to manage expand/collapse of groups
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});

  const menuGroups: MenuGroup[] = [
    {
      id: 'movies-group',
      label: 'Quản lý phim',
      icon: Film,
      items: [
        { id: 'movies', label: 'Phim', icon: Clapperboard },
        { id: 'showtimes', label: 'Lịch Chiếu', icon: Calendar }
      ]
    },
    {
      id: 'cinemas-group',
      label: 'Quản lý rạp',
      icon: Building,
      items: [
        { id: 'cinemas', label: 'Rạp', icon: Building },
        { id: 'halls', label: 'Phòng', icon: Tv },
        { id: 'seats', label: 'Ghế', icon: Grid }
      ]
    },
    {
      id: 'customers-group',
      label: 'Khách hàng',
      icon: Users,
      items: [
        { id: 'users', label: 'Người Dùng', icon: Users },
        { id: 'reviews', label: 'Đánh Giá', icon: MessageSquare }
      ]
    },
    {
      id: 'business-group',
      label: 'Kinh doanh',
      icon: DollarSign,
      items: [
        { id: 'ticketprices', label: 'Giá Vé', icon: DollarSign },
        { id: 'promotions', label: 'Khuyến Mãi', icon: Tag },
        { id: 'combos', label: 'Bắp Nước (Combo)', icon: Coffee },
        { id: 'news', label: 'Tin Tức & Sự Kiện', icon: Newspaper },
        { id: 'bookings', label: 'Vé Đặt', icon: Ticket },
        { id: 'masterdata', label: 'Dữ Liệu Nguồn', icon: Database }
      ]
    }
  ];

  // Auto expand group of active tab on load
  React.useEffect(() => {
    const activeGroup = menuGroups.find(group => 
      group.items.some(item => item.id === activeTab)
    );
    if (activeGroup) {
      setExpandedGroups(prev => ({
        ...prev,
        [activeGroup.id]: true
      }));
    }
  }, [activeTab]);

  const handleMenuClick = (tabId: string) => {
    navigate(`/admin?tab=${tabId}`);
    setIsMobileOpen(false); // Close mobile drawer on click
  };

  const toggleGroup = (groupId: string) => {
    if (!isOpen && !isMobileOpen) {
      // Expand sidebar and expand this group
      setIsOpen(true);
      setExpandedGroups(prev => ({
        ...prev,
        [groupId]: true
      }));
      return;
    }
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
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
              <div className="h-9 w-9 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20 animate-pulse">
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
            {/* Standalone root item: Tổng quan */}
            <button
              onClick={() => handleMenuClick('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider relative group transition-all cursor-pointer text-left ${
                activeTab === 'dashboard'
                  ? 'text-white font-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {activeTab === 'dashboard' && (
                <motion.div
                  layoutId="activeAdminTabGlow"
                  className="absolute inset-0 bg-gradient-to-r from-brand/20 to-brand-gold/10 border border-brand/25 rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {activeTab === 'dashboard' && (
                <div className="absolute left-0 top-1/3 bottom-1/3 w-[3px] bg-brand rounded-r" />
              )}
              <LayoutDashboard
                size={16}
                className={`shrink-0 transition-colors ${
                  activeTab === 'dashboard' ? 'text-brand' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {(isOpen || isMobileOpen) && <span>Tổng quan</span>}
              {!isOpen && !isMobileOpen && (
                <div className="absolute left-20 hidden group-hover:block bg-[#16161c] border border-white/10 text-white text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50">
                  Tổng quan
                </div>
              )}
            </button>

            {/* Collapsible Accordion Groups */}
            {menuGroups.map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = !!expandedGroups[group.id];
              const isGroupActive = group.items.some((item) => item.id === activeTab);

              return (
                <div key={group.id} className="flex flex-col gap-1 mt-1">
                  {/* Group Header Button */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-left group ${
                      isGroupActive 
                        ? 'text-brand-gold bg-white/[0.01]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <GroupIcon
                        size={16}
                        className={`shrink-0 transition-colors ${
                          isGroupActive ? 'text-brand-gold' : 'text-gray-400 group-hover:text-white'
                        }`}
                      />
                      {(isOpen || isMobileOpen) && <span>{group.label}</span>}
                    </div>

                    {(isOpen || isMobileOpen) && (
                      <span className="text-gray-500 group-hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </span>
                    )}

                    {/* Tooltip on collapsed state */}
                    {!isOpen && !isMobileOpen && (
                      <div className="absolute left-20 hidden group-hover:block bg-[#16161c] border border-white/10 text-white text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50">
                        {group.label} ({group.items.map(i => i.label).join(', ')})
                      </div>
                    )}
                  </button>

                  {/* Submenu items list */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (isOpen || isMobileOpen) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden flex flex-col gap-1.5 ml-5 border-l border-white/5 pl-3 text-left"
                      >
                        {group.items.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = activeTab === subItem.id;

                          return (
                            <button
                              key={subItem.id}
                              onClick={() => handleMenuClick(subItem.id)}
                              className={`w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-left relative group ${
                                isSubActive
                                  ? 'text-white bg-white/[0.03]'
                                  : 'text-gray-400 hover:text-white hover:bg-white/[0.01]'
                              }`}
                            >
                              <span className="text-gray-600 font-normal select-none mr-0.5">├</span>
                              <SubIcon
                                size={13}
                                className={`shrink-0 transition-colors ${
                                  isSubActive ? 'text-brand' : 'text-gray-500 group-hover:text-gray-300'
                                }`}
                              />
                              <span>{subItem.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer commands */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-brand hover:bg-brand/5 transition-all cursor-pointer group text-left relative"
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
