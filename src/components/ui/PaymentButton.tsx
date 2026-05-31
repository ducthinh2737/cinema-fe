import React from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  totalAmount: number;
  label?: string;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  onClick,
  isLoading,
  disabled = false,
  totalAmount,
  label = "Proceed to Payment",
}) => {
  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(totalAmount);

  return (
    <motion.button
      whileHover={disabled || isLoading ? {} : { scale: 1.01 }}
      whileTap={disabled || isLoading ? {} : { scale: 0.99 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden select-none cursor-pointer ${
        disabled || isLoading
          ? 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed'
          : 'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20 hover:shadow-brand/40 border border-brand-gold/20'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-white" />
          <span>Processing Checkout...</span>
        </>
      ) : (
        <>
          <ShieldCheck size={16} className="text-emerald-400" />
          <span>{label} • {formattedPrice}</span>
        </>
      )}
    </motion.button>
  );
};
