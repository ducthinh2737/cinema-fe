import React from 'react';
import { motion } from 'framer-motion';

export type PromotionCategory = 'all' | 'promotions' | 'news' | 'events' | 'vouchers' | 'members';

interface PromotionTabsProps {
  activeTab: PromotionCategory;
  onTabChange: (tab: PromotionCategory) => void;
}

export const PromotionTabs: React.FC<PromotionTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'promotions', label: 'Khuyến mãi' },
    { id: 'news', label: 'Tin điện ảnh' },
    { id: 'events', label: 'Sự kiện' },
    { id: 'vouchers', label: 'Voucher' },
    { id: 'members', label: 'Thành viên' },
  ] as const;

  return (
    <div className="relative w-full border-b border-white/5 pb-1 select-none">
      {/* Scrollable Container */}
      <div 
        className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shrink-0 cursor-pointer ${
                isActive 
                  ? 'text-brand' 
                  : 'text-gray-400 hover:text-white bg-white/[0.01] hover:bg-white/[0.04] border border-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 rounded-xl border border-brand/40 bg-brand/5 shadow-[0_0_15px_rgba(224,36,36,0.15)] pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
