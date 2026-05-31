import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PaymentMethodCardProps {
  methodId: string;
  name: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  logo: React.ReactNode;
  glowColor: string; // Tailwind glow border/shadow classes
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  methodId,
  name,
  description,
  isSelected,
  onSelect,
  logo,
  glowColor,
}) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      data-method-id={methodId}
      className={`relative p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex items-center gap-4 select-none ${
        isSelected
          ? `bg-white/[0.04] border-brand shadow-[0_0_20px_rgba(229,9,20,0.15)] ${glowColor}`
          : 'border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03]'
      }`}
    >
      {/* Selector Checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3 h-5 w-5 bg-brand text-white rounded-full flex items-center justify-center border border-brand-gold/30">
          <Check size={12} />
        </div>
      )}

      {/* Brand Logo Panel */}
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border bg-[#0d0d12] transition-colors ${
        isSelected ? 'border-brand/40 text-brand' : 'border-white/5 text-gray-500'
      }`}>
        {logo}
      </div>

      {/* Description Panel */}
      <div className="flex-grow min-w-0 pr-4">
        <h4 className="text-sm font-black text-white uppercase tracking-wider">{name}</h4>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{description}</p>
      </div>

    </motion.div>
  );
};
