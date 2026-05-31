import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Copy, Check } from 'lucide-react';

export interface VoucherItem {
  id: number;
  code: string;
  discountType: 'Percentage' | 'FixedAmount';
  discountValue: number;
  minOrderValue?: number;
  description: string;
  endDate: string;
}

interface VoucherCardProps {
  voucher: VoucherItem;
}

export const VoucherCard: React.FC<VoucherCardProps> = ({ voucher }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const discountText = voucher.discountType === 'Percentage' 
    ? `${voucher.discountValue}%` 
    : `${(voucher.discountValue / 1000).toFixed(0)}K`;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-[#0c0c12]/90 border border-white/5 hover:border-brand-gold/30 rounded-2xl p-5 shadow-xl flex items-center gap-5 relative overflow-hidden transition-all duration-300 select-none text-left group hover:shadow-[0_0_20px_rgba(229,169,59,0.08)]"
    >
      {/* Decorative semi-circles for ticket edge punch look */}
      <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 h-5 w-5 rounded-full bg-[#07070a] border-r border-white/5" />
      <div className="absolute top-1/2 -translate-y-1/2 -right-2.5 h-5 w-5 rounded-full bg-[#07070a] border-l border-white/5" />

      {/* Dotted Divider line */}
      <div className="absolute top-0 bottom-0 left-20 w-[1px] border-l border-dashed border-white/10" />

      {/* Left Discount value circle */}
      <div className="flex flex-col items-center justify-center shrink-0 w-12 text-center">
        <span className="text-xl font-black text-brand-gold leading-none">{discountText}</span>
        <span className="text-[7px] text-gray-500 font-extrabold uppercase tracking-widest mt-1">GIẢM</span>
      </div>

      {/* Right details */}
      <div className="flex-grow pl-5 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Ticket size={11} className="text-brand" />
            <span className="text-xs font-black text-white font-mono tracking-widest select-all uppercase">
              {voucher.code}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed line-clamp-2">
            {voucher.description}
          </p>
        </div>

        {/* Expiry and Copy button */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 mt-0.5">
          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">
            Hạn dùng: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
          </span>

          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              copied 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-white/5 hover:bg-brand-gold hover:text-black border border-white/5 hover:border-brand-gold text-brand-gold'
            }`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <Check size={10} /> Đã sao chép
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <Copy size={10} /> Copy Mã
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
