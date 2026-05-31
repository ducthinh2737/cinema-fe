import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2 } from 'lucide-react';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  return (
    <div className="w-full bg-[#0c0c12] border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl select-none text-left">
      {/* Decorative Blur glows */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
        
        {/* Texts */}
        <div className="flex-1 flex flex-col gap-2.5">
          <span className="text-[9px] text-brand font-extrabold uppercase tracking-widest bg-brand/10 border border-brand/20 px-3 py-1 rounded-md w-max">
            Đăng ký bản tin
          </span>
          <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
            Nhận tin khuyến mãi sớm nhất
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            Đừng bỏ lỡ các đợt mở bán vé VIP trước, các ưu đãi đặc quyền lên tới 50% cùng combo quà tặng bắp nước giới hạn.
          </p>
        </div>

        {/* Form Form */}
        <div className="w-full md:w-auto flex-shrink-0 min-w-[280px] md:min-w-[340px]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="email"
              required
              placeholder="Nhập email của bạn..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#07070a]/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/20 transition-all w-full"
            />
            <button
              type="submit"
              className="bg-brand hover:bg-brand-hover text-white p-3.5 rounded-xl transition-all shadow-md shadow-brand/20 hover:shadow-brand/40 flex items-center justify-center cursor-pointer border border-brand/20"
              title="Đăng ký"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

      </div>

      {/* Subscription Alert pop-up */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-0 bg-[#0f0f16]/95 z-20 flex items-center justify-center p-6"
          >
            <div className="flex flex-col items-center gap-2 text-center max-w-sm">
              <CheckCircle2 size={36} className="text-brand-gold animate-bounce" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Đăng ký thành công!</h4>
              <p className="text-xs text-gray-400 font-medium">
                Bạn đã ghi danh nhận bản tin ưu đãi điện ảnh sớm nhất từ chúng tôi.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
