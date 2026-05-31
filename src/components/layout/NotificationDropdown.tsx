import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Ticket, Gift, CreditCard, Info } from 'lucide-react';
import type { Notification } from '../../types';

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  hasMore,
  loadingMore,
}) => {
  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'booking':
        return <Ticket size={14} className="text-brand-gold" />;
      case 'payment':
        return <CreditCard size={14} className="text-blue-400" />;
      case 'promotion':
        return <Gift size={14} className="text-emerald-400" />;
      default:
        return <Info size={14} className="text-gray-400" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'booking':
        return 'border-brand-gold/20 bg-brand-gold/5';
      case 'payment':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'promotion':
        return 'border-emerald-500/20 bg-emerald-500/5';
      default:
        return 'border-white/10 bg-white/5';
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diffMs = new Date().getTime() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return new Date(dateStr).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const tolerance = 5; // px tolerance
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + tolerance;
    
    if (isBottom && hasMore && !loadingMore) {
      onLoadMore();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute right-0 mt-3 w-80 md:w-96 bg-[#0f0f12]/95 border border-white/10 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden z-50 select-none"
    >
      {/* Dropdown Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse shadow-[0_0_8px_#e50914]" />
          <span className="font-extrabold text-sm tracking-wide text-white uppercase">Thông Báo</span>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover font-semibold transition-colors bg-brand/10 hover:bg-brand/20 px-2.5 py-1 rounded-lg border border-brand/20 cursor-pointer"
          >
            <Check size={12} />
            Đọc tất cả
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div
        onScroll={handleScroll}
        className="max-h-[360px] overflow-y-auto divide-y divide-white/5 custom-scrollbar"
      >
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="p-4 bg-white/5 rounded-full border border-white/5 mb-3 text-gray-500">
              <Bell size={24} className="stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-gray-400">Không có thông báo mới!</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Hộp thư thông báo của bạn trống.</p>
          </div>
        ) : (
          notifications.map((notif, index) => (
            <motion.div
              key={notif.notificationId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.3) }}
              className={`group p-4 flex gap-3 hover:bg-white/[0.02] transition-all relative overflow-hidden ${
                !notif.isRead 
                  ? 'bg-white/[0.015] border-l-2 border-l-brand' 
                  : 'border-l-2 border-l-transparent'
              }`}
            >
              {/* Type Indicator Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <div className={`h-7 w-7 rounded-lg border flex items-center justify-center shadow-inner transition-colors ${getTypeStyle(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>
              </div>

              {/* Message Details */}
              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-gray-100 truncate group-hover:text-brand-gold transition-colors">
                    {notif.title}
                  </p>
                  <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed break-words pr-4">
                  {notif.message}
                </p>
              </div>

              {/* Unread Highlight Dot / Mark as read Button */}
              <div className="flex items-center self-center absolute right-3">
                {!notif.isRead ? (
                  <button
                    onClick={() => onMarkAsRead(notif.notificationId)}
                    className="p-1 bg-[#141419] hover:bg-brand/10 text-gray-400 hover:text-brand border border-white/5 rounded-md transition-all md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                    title="Đánh dấu đã đọc"
                  >
                    <Check size={12} />
                  </button>
                ) : null}
                
                {!notif.isRead && (
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-gold shadow-[0_0_6px_#e5a93b] md:group-hover:hidden ml-2" />
                )}
              </div>
            </motion.div>
          ))
        )}

        {/* Paginated Loading Indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-4 bg-white/[0.01]">
            <div className="w-5 h-5 rounded-full border-2 border-white/5 border-t-brand animate-spin" />
          </div>
        )}
      </div>

      {/* Overlay Glow Effect */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent" />
    </motion.div>
  );
};
