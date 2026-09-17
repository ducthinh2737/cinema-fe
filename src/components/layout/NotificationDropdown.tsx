import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import type { Notification } from '../../types';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: number) => void;
  onMarkAllAsRead?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

// Pure helper function defined outside component to prevent re-creation
const formatRelativeTime = (dateStr: string): string => {
  try {
    if (!dateStr) return '';
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays} ngày trước`;

    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '';
  }
};

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="divide-y divide-white/5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 flex gap-3.5 animate-pulse">
          <div className="flex-shrink-0 mt-0.5">
            <div className="h-8 w-8 rounded-lg bg-white/10" />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="h-3 bg-white/10 rounded w-1/3" />
              <div className="h-2 bg-white/5 rounded w-1/6" />
            </div>
            <div className="h-2.5 bg-white/10 rounded w-5/6 mt-2" />
            <div className="h-2.5 bg-white/10 rounded w-2/3 mt-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications = [],
  onMarkAsRead = () => {},
  onMarkAllAsRead = () => {},
  onLoadMore = () => {},
  hasMore = false,
  loadingMore = false,
}) => {
  const isFetchingRef = useRef(false);

  // Sync ref with loadingMore state to throttle scroll events
  useEffect(() => {
    if (!loadingMore) {
      isFetchingRef.current = false;
    }
  }, [loadingMore]);

  // Memoize unread count safely
  const unreadCount = useMemo(() => 
    (notifications || []).filter((n) => n && !n.isRead).length, 
    [notifications]
  );

  // Memoize scroll handler to prevent re-creation
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const tolerance = 15; // px tolerance
      const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + tolerance;

      if (isBottom && hasMore && !loadingMore && !isFetchingRef.current) {
        isFetchingRef.current = true;
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, loadingMore]
  );

  const notificationsList = notifications || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute right-0 mt-3 w-[calc(100vw-24px)] sm:w-[340px] md:w-[380px] bg-[#0f0f12]/95 border border-white/10 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden z-50 select-none"
      role="dialog"
      aria-label="Hộp thư thông báo"
    >
      {/* Dropdown Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse shadow-[0_0_8px_#e50914]" />
          <span className="font-extrabold text-sm tracking-wide text-white uppercase">Thông Báo</span>
          {unreadCount > 0 && (
            <span className="bg-brand/20 text-brand text-[10px] font-black px-2 py-0.5 rounded-full border border-brand/20 animate-pulse">
              {unreadCount} chưa đọc
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover font-semibold transition-all duration-200 bg-brand/10 hover:bg-brand/20 px-2.5 py-1.5 rounded-lg border border-brand/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
            aria-label="Đánh dấu tất cả thông báo là đã đọc"
          >
            <Check size={12} className="stroke-[2.5]" />
            Đọc tất cả
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div
        onScroll={handleScroll}
        className="max-h-[360px] overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent custom-scrollbar"
        role="list"
      >
        {notificationsList.length === 0 && !loadingMore ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center select-none">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ repeat: Infinity, repeatDelay: 5, duration: 0.8 }}
              className="p-4 bg-brand/10 border border-brand/20 rounded-full mb-4 text-brand shadow-[0_0_15px_rgba(229,9,20,0.1)]"
            >
              <Bell size={28} className="stroke-[1.5]" />
            </motion.div>
            <p className="text-sm font-bold text-gray-200">Không có thông báo mới</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[220px] leading-relaxed">
              Thông báo về lịch chiếu, khuyến mãi và thanh toán của bạn sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {notificationsList.filter(Boolean).map((notif) => (
                <NotificationItem
                  key={notif.notificationId}
                  notification={notif}
                  onMarkAsRead={onMarkAsRead}
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Loading Skeleton */}
        {loadingMore && <LoadingSkeleton />}
      </div>

      {/* Footer Info */}
      {notificationsList.length === 0 && !loadingMore ? null : (
        <div className="py-3 px-5 text-center bg-white/[0.01] border-t border-white/5 select-none">
          {loadingMore ? (
            <span className="text-xs text-gray-500 font-medium animate-pulse">Đang tải thông báo...</span>
          ) : hasMore ? (
            <button
              onClick={onLoadMore}
              className="text-xs text-brand-gold hover:text-brand-gold-hover font-semibold transition-colors focus:outline-none cursor-pointer"
            >
              Xem thêm thông báo
            </button>
          ) : (
            <span className="text-[10px] text-gray-600 font-medium">Đã hiển thị tất cả thông báo</span>
          )}
        </div>
      )}

      {/* Overlay Glow Effect */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent pointer-events-none" />
    </motion.div>
  );
};
