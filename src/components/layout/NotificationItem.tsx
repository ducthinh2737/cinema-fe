import React from 'react';
import { Check, Ticket, CreditCard, Gift, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Notification } from '../../types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  formatRelativeTime: (dateStr: string) => string;
}

const notificationTypeConfig = {
  booking: {
    icon: Ticket,
    iconColor: 'text-brand-gold',
    borderColor: 'border-brand-gold/20',
    backgroundColor: 'bg-brand-gold/10',
  },
  payment: {
    icon: CreditCard,
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    backgroundColor: 'bg-blue-500/10',
  },
  promotion: {
    icon: Gift,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    backgroundColor: 'bg-emerald-500/10',
  },
  default: {
    icon: Info,
    iconColor: 'text-gray-400',
    borderColor: 'border-white/10',
    backgroundColor: 'bg-white/10',
  },
};

export const NotificationItem: React.FC<NotificationItemProps> = React.memo(({
  notification,
  onMarkAsRead = () => {},
  formatRelativeTime = () => '',
}) => {
  if (!notification) return null;

  const typeStr = notification.type || '';
  const typeKey = typeStr.toLowerCase() as keyof typeof notificationTypeConfig;
  const config = notificationTypeConfig[typeKey] || notificationTypeConfig.default;
  const IconComponent = config.icon || Info;

  const title = notification.title || '';
  const message = notification.message || '';
  const createdAt = notification.createdAt || '';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMarkAsRead(notification.notificationId);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className={`group p-4 flex gap-3.5 transition-all duration-200 relative overflow-hidden select-none border-b border-white/5 cursor-default
        ${!notification.isRead 
          ? 'bg-white/[0.03] border-l-[3px] border-l-brand' 
          : 'bg-transparent border-l-[3px] border-l-transparent hover:bg-white/[0.015]'
        }
        hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:border-white/10
      `}
      role="listitem"
      tabIndex={0}
      aria-label={`${notification.isRead ? '' : 'Chưa đọc: '}${title}. ${message}`}
    >
      {/* Type Indicator Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shadow-inner transition-transform duration-200 group-hover:scale-110 ${config.borderColor} ${config.backgroundColor}`}>
          <IconComponent size={15} className={`${config.iconColor}`} />
        </div>
      </div>

      {/* Message Details */}
      <div className="flex-grow min-w-0 pr-6">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-xs truncate transition-colors duration-200 ${!notification.isRead ? 'font-bold text-white' : 'font-semibold text-gray-300'} group-hover:text-brand-gold`}>
              {title}
            </p>
            {!notification.isRead && (
              <span className="flex-shrink-0 text-[8px] bg-brand text-white px-1 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                NEW
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed break-words pr-2">
          {message}
        </p>
      </div>

      {/* Action Buttons / Unread Dots */}
      <div className="flex items-center absolute right-3 top-1/2 -translate-y-1/2">
        {!notification.isRead ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.notificationId);
            }}
            onKeyDown={handleKeyDown}
            className="p-1.5 bg-[#141419] hover:bg-brand/20 text-gray-400 hover:text-brand border border-white/5 rounded-md transition-all duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
            title="Đánh dấu đã đọc"
            aria-label="Đánh dấu thông báo này là đã đọc"
            tabIndex={0}
          >
            <Check size={12} className="stroke-[2.5]" />
          </button>
        ) : null}
        
        {!notification.isRead && (
          <div className="h-1.5 w-1.5 rounded-full bg-brand-gold shadow-[0_0_6px_#e5a93b] md:group-hover:hidden ml-2 transition-all duration-200 flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
});

NotificationItem.displayName = 'NotificationItem';
