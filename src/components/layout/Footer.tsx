import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  ShieldCheck, 
  HelpCircle, 
  Film 
} from 'lucide-react';

export const Footer: React.FC = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  const socialLinks = [
    { 
      icon: (props: { className?: string; size?: number }) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} width={props.size} height={props.size}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ), 
      href: '#', 
      label: 'Facebook', 
      color: 'hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:shadow-[0_0_15px_rgba(24,119,242,0.4)]' 
    },
    { 
      icon: (props: { className?: string; size?: number }) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} width={props.size} height={props.size}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      ), 
      href: '#', 
      label: 'Instagram', 
      color: 'hover:text-[#E1306C] hover:border-[#E1306C]/40 hover:shadow-[0_0_15px_rgba(225,48,108,0.4)]' 
    },
    { 
      icon: (props: { className?: string; size?: number }) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} width={props.size} height={props.size}>
          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
        </svg>
      ), 
      href: '#', 
      label: 'Twitter', 
      color: 'hover:text-[#1DA1F2] hover:border-[#1DA1F2]/40 hover:shadow-[0_0_15px_rgba(29,161,242,0.4)]' 
    },
    { 
      icon: (props: { className?: string; size?: number }) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} width={props.size} height={props.size}>
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
        </svg>
      ), 
      href: '#', 
      label: 'Youtube', 
      color: 'hover:text-[#FF0000] hover:border-[#FF0000]/40 hover:shadow-[0_0_15px_rgba(255,0,0,0.4)]' 
    },
  ];

  const quickLinks = [
    { name: 'Trang Chủ', path: '/' },
    { name: 'Phim', path: '/movies' },
    { name: 'Rạp Chiếu', path: '/#cinemas' },
    { name: 'Khuyến Mãi', path: '/promotions' },
  ];

  const supportLinks = [
    { name: 'Hỏi Đáp (FAQs)', path: '#' },
    { name: 'Điều Khoản Sử Dụng', path: '#' },
    { name: 'Chính Sách Bảo Mật', path: '#' },
    { name: 'Liên Hệ Hỗ Trợ', path: '#' },
  ];

  return (
    <footer className="relative bg-[#07070a] border-t border-white/5 pt-16 pb-8 px-4 md:px-8 mt-20 select-none overflow-hidden">
      {/* Red/Gold Glow Backdrops */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Neon Divider Line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Newsletter & Core branding grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-white/5">
          {/* Brand Presentation */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-widest bg-gradient-to-r from-brand via-brand-gold to-brand bg-clip-text text-transparent">
                CINEMAPASS
              </span>
            </Link>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Trải nghiệm đỉnh cao công nghệ đặt vé xem phim trực tuyến. Đặt ghế VIP sang trọng và ghế đôi Sweetbox với cập nhật thời gian thực và thanh toán bảo mật.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3.5 mt-2">
              {socialLinks.map((social, idx) => {
                const Icon = social.icon;
                return (
                  <a
                    key={idx}
                    href={social.href}
                    aria-label={social.label}
                    className={`h-9 w-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 bg-white/[0.02] backdrop-blur-md transition-all duration-300 ${social.color}`}
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Newsletter Subscription */}
          <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col md:flex-row items-center gap-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <div className="flex-grow min-w-0 text-left">
              <h4 className="text-base font-black text-white tracking-wide uppercase">Bản Tin Điện Ảnh Hàng Tuần</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-md">
                Đăng ký để nhận thông báo độc quyền về vé phim bom tấn, mã giảm giá VIP và các sự kiện ra mắt đặc sắc.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="w-full md:w-auto flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Nhập địa chỉ email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#0f0f13]/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-all w-full md:w-56"
                />
              </div>
              <button
                type="submit"
                className="bg-brand hover:bg-brand-hover text-white p-2.5 rounded-xl transition-all shadow-md shadow-brand/20 hover:shadow-brand/40 flex items-center justify-center cursor-pointer"
                title="Đăng ký"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        {/* Sub-directories and Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 text-left">
          {/* Quick links */}
          <div>
            <h5 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Film size={12} className="text-brand" />
              Danh Mục
            </h5>
            <ul className="flex flex-col gap-2.5 text-xs">
              {quickLinks.map((link, idx) => {
                const handleScrollToHash = (e: React.MouseEvent) => {
                  if (link.path.startsWith('/#') && location.pathname === '/') {
                    e.preventDefault();
                    const id = link.path.substring(2);
                    const element = document.getElementById(id);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    window.history.pushState(null, '', link.path);
                  }
                };

                return (
                  <li key={idx}>
                    <Link
                      to={link.path}
                      onClick={handleScrollToHash}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Support options */}
          <div>
            <h5 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <HelpCircle size={12} className="text-brand-gold" />
              Hỗ Trợ
            </h5>
            <ul className="flex flex-col gap-2.5 text-xs">
              {supportLinks.map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h5 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              Liên Hệ
            </h5>
            <ul className="flex flex-col gap-3 text-xs text-gray-400">
              <li className="flex items-start gap-2.5 leading-normal">
                <MapPin size={14} className="text-brand flex-shrink-0 mt-0.5" />
                <span>Tầng 5, Trung tâm Điện ảnh, Quận 1, Thành phố Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={14} className="text-brand-gold flex-shrink-0" />
                <span>+84 (1900) 2088</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={14} className="text-brand flex-shrink-0" />
                <span>support@cinemapass.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom copyright */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <span>&copy; {new Date().getFullYear()} Tập đoàn CinemaPass. Bảo lưu mọi quyền.</span>
          <div className="flex items-center gap-6">
            <span className="hover:text-gray-400 cursor-pointer">Tiêu chuẩn an toàn</span>
            <span className="hover:text-gray-400 cursor-pointer">Khả năng truy cập</span>
          </div>
        </div>

      </div>

      {/* Success alert message for Newsletter */}
      {subscribed && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 right-6 z-50 bg-[#0f0f13] border border-brand-gold/40 text-brand-gold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-xl"
        >
          <div className="h-2 w-2 rounded-full bg-brand-gold animate-ping" />
          <span className="text-xs font-bold">Đã đăng ký bản tin thành công!</span>
        </motion.div>
      )}
    </footer>
  );
};
