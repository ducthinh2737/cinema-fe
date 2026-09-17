import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Download,
  Share2,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Printer,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient, getImageUrl } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { parseApiDate } from '../../utils/dateHelpers';
import type { Booking } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleCheckIn = async () => {
    if (!id || !booking) return;
    setIsCheckingIn(true);
    try {
      const res = await apiClient.post<any>(`/bookings/${id}/checkin`);
      const responseData = res.data?.data ?? res.data;
      setBooking(responseData);
      showToast('Check-in vé thành công!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Check-in vé thất bại.';
      showToast(msg, 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Fetch Booking Details
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    apiClient.get<any>(`/bookings/${id}`)
      .then((res) => {
        const responseData = res.data?.data ?? res.data;
        setBooking(responseData);
      })
      .catch((err: any) => {
        const msg = err.response?.data?.Message || 'Tải thông tin vé thất bại.';
        setError(msg);
        showToast(msg, 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Handle Share Ticket
  const handleShare = async () => {
    if (!booking) return;

    const shareData = {
      title: 'Vé Xem Phim CinemaPass',
      text: `Xem vé xem phim của tôi cho phim ${booking.movieTitle || booking.showtime?.movie?.title || 'Movie'} lượng ${booking.movieDuration || booking.showtime?.movie?.duration || 120} phút. Mã vé: ${booking.bookingCode}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('Đã chia sẻ thông tin vé thành công!', 'success');
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\nXem vé tại đây: ${shareData.url}`);
        showToast('Đã sao chép liên kết vé vào bộ nhớ tạm!', 'success');
      }
    } catch (err) {
      console.error('Error sharing ticket:', err);
    }
  };

  // Handle Download PNG (Draws high-fidelity ticket on Canvas for safe offline storage)
  const handleDownloadPNG = () => {
    if (!booking) return;

    setIsDownloading(true);
    showToast('Đang tạo ảnh vé để tải xuống...', 'info');

    // Create a hidden canvas to render the physical-looking card
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load background poster image if available, fallback to gradient
    const moviePoster = new Image();
    moviePoster.crossOrigin = 'anonymous';
    moviePoster.src = getImageUrl(booking.moviePosterUrl) || booking.showtime?.movie?.posterUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300';

    moviePoster.onload = () => {
      drawCanvasTicket(canvas, ctx, moviePoster);
    };

    moviePoster.onerror = () => {
      drawCanvasTicket(canvas, ctx, null);
    };
  };

  const drawCanvasTicket = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    posterImg: HTMLImageElement | null
  ) => {
    if (!booking) return;

    // 1. Draw solid dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw poster preview (Left vertical column background blur or dimmed display)
    if (posterImg) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.drawImage(posterImg, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Draw card background
    ctx.fillStyle = 'rgba(20, 20, 28, 0.9)';
    ctx.fillRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Card border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Header Branding
    ctx.fillStyle = '#d4af37';
    ctx.font = 'black 22px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('VE XEM PHIM CAO CAP CINEMAPASS', canvas.width / 2, 70);

    // Horizontal tear-off dots
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.moveTo(30, 620);
    ctx.lineTo(canvas.width - 30, 620);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw notches (circular punches on edges)
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath();
    ctx.arc(30, 620, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(canvas.width - 30, 620, 16, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Movie Details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    const movieTitle = booking.movieTitle || booking.showtime?.movie?.title || 'Unknown Movie';
    // Wrap text if too long
    if (movieTitle.length > 25) {
      ctx.fillText(movieTitle.slice(0, 25) + '...', 60, 150);
    } else {
      ctx.fillText(movieTitle, 60, 150);
    }

    ctx.fillStyle = '#9e9e9e';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${booking.movieDuration || booking.showtime?.movie?.duration || 120} phut • ${booking.showtime?.hall?.hallTypeName || '2D'}`, 60, 185);

    // Detail rows
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('RAP CHIEU', 60, 240);
    ctx.fillText('NGAY CHIEU', 60, 310);
    ctx.fillText('GIO CHIEU', 330, 310);
    ctx.fillText('PHONG CHIEU', 60, 380);
    ctx.fillText('GHE DA CHON', 330, 380);
    ctx.fillText('MA DAT VE', 60, 450);
    ctx.fillText('TONG THANH TOAN', 330, 450);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(booking.cinemaName || 'Cinema Pass Complex', 60, 265);
    ctx.fillText((booking.startTime || booking.showtime?.startTime) ? parseApiDate(booking.startTime || booking.showtime!.startTime).toLocaleDateString('vi-VN') : 'N/A', 60, 335);
    ctx.fillText((booking.startTime || booking.showtime?.startTime) ? parseApiDate(booking.startTime || booking.showtime!.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A', 330, 335);
    ctx.fillText(booking.hallName || booking.showtime?.hall?.name || 'Hall 1', 60, 405);

    const seatString = booking.seats?.join(', ') || booking.bookingSeats?.map(bs => `${bs.seat?.rowName || ''}${bs.seat?.seatNumber || ''}`).join(', ') || '';
    ctx.fillStyle = '#d4af37'; // gold seats
    ctx.fillText(seatString, 330, 405);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(booking.bookingCode, 60, 475);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${(booking.totalAmount).toLocaleString()} VND`, 330, 475);

    // Status Badge
    ctx.fillStyle = booking.bookingStatus === 'Confirmed' ? '#4ade80' : booking.bookingStatus === 'CheckedIn' ? '#c084fc' : booking.bookingStatus === 'Cancelled' ? '#f87171' : '#fbbf24';
    ctx.fillRect(60, 520, 130, 32);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const statusText = booking.bookingStatus === 'Confirmed' ? 'DA XAC NHAN' : booking.bookingStatus === 'CheckedIn' ? 'DA CHECK-IN' : booking.bookingStatus === 'Cancelled' ? 'DA HUY' : 'CHO THANH TOAN';
    ctx.fillText(statusText, 125, 540);

    // 4. Draw QR Stubb Footer
    ctx.fillStyle = '#9e9e9e';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUET MA DE CHECK-IN TAI CUA VAO', canvas.width / 2, 670);

    // Draw a high-fidelity QR Code simulation block
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/booking/' + booking.bookingId)}`;

    qrImg.onload = () => {
      ctx.drawImage(qrImg, canvas.width / 2 - 75, 700, 150, 150);
      triggerDownload(canvas);
    };

    qrImg.onerror = () => {
      // Draw simulated outline fallback
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(canvas.width / 2 - 75, 700, 150, 150);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText('[MA QR]', canvas.width / 2, 780);
      triggerDownload(canvas);
    };
  };

  const triggerDownload = (canvas: HTMLCanvasElement) => {
    if (!booking) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Ticket-${booking.bookingCode}.png`;
    link.href = dataUrl;
    link.click();
    setIsDownloading(false);
    showToast('Đã tải xuống vé thành công!', 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'text-green-400 border-green-500/20 bg-green-500/5';
      case 'CheckedIn':
        return 'text-purple-400 border-purple-500/20 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
      case 'Cancelled':
        return 'text-brand border-brand/20 bg-brand/5';
      default:
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-brand animate-spin" />
        <span className="text-xs text-gray-500 font-extrabold uppercase tracking-widest">Đang Tải Thông Tin Vé...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center flex flex-col items-center gap-6">
        <div className="p-3.5 bg-brand/10 border border-brand/20 text-brand rounded-full">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-wide uppercase">Không Tìm Thấy Vé</h2>
          <p className="text-xs text-gray-400 mt-2">{error || 'Giao dịch đặt vé này không tồn tại hoặc bạn không có quyền truy cập.'}</p>
        </div>
        <Link to="/" className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          Quay lại Trang Phim
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 select-none text-left relative min-h-screen">
      <style>{`
        @media print {
          body {
            background: #000000 !important;
          }
          nav, footer, .lg\\:col-span-4, .mb-6, button {
            display: none !important;
          }
          #ticket-print-area {
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: 100% !important;
            max-width: 600px !important;
            border: none !important;
            box-shadow: none !important;
            background: #121217 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      {/* Decorative Radial Backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-brand/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-brand-gold/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Back to Profile header trigger */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/profile?tab=bookings')}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} /> Quay lại Vé Của Tôi
        </button>

        <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Mã: #{booking.bookingId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cinematic Floating Ticket Widget */}
        <div className="lg:col-span-8">
          <motion.div
            ref={ticketRef}
            id="ticket-print-area"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: [0, -6, 0], opacity: 1 }}
            transition={{
              y: { repeat: Infinity, duration: 5, ease: 'easeInOut' },
              opacity: { duration: 0.4 }
            }}
            className="w-full bg-[#121217]/90 border border-white/10 rounded-3xl overflow-hidden shadow-[0_15px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl relative"
          >
            {/* Ticket Border Glow highlights */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />

            {/* Poster banner top section with glassmorphism blur */}
            <div className="relative h-48 md:h-64 overflow-hidden border-b border-white/5">
              <img
                src={getImageUrl(booking.movieBannerUrl) || booking.showtime?.movie?.bannerUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=800'}
                alt="banner"
                className="w-full h-full object-cover filter brightness-[0.4]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121217] via-transparent to-black/40" />

              {/* Float info layout */}
              <div className="absolute bottom-5 inset-x-6 flex items-end gap-5">
                <img
                  src={getImageUrl(booking.moviePosterUrl) || booking.showtime?.movie?.posterUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300'}
                  alt="Poster"
                  className="hidden md:block w-20 h-28 object-cover rounded-lg border border-white/10 shadow-lg shadow-black/50"
                />
                <div>
                  <span className="text-[9px] bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                    Vé Xem Phim
                  </span>
                  <h1 className="text-xl md:text-2xl font-black text-white uppercase mt-2 tracking-wide leading-snug drop-shadow-md">
                    {booking.movieTitle || booking.showtime?.movie?.title || 'Tên Phim'}
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">
                    Thời lượng: {booking.movieDuration || booking.showtime?.movie?.duration || 120} phút • {booking.showtime?.hall?.hallTypeName || '2D'}
                  </p>
                </div>
              </div>
            </div>

            {/* Ticket Body Content */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start justify-between">
              
              {/* Ticket Details Panel */}
              <div className="w-full md:w-3/5 grid grid-cols-2 gap-y-5 gap-x-4">
                
                <div className="col-span-2">
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">Cụm rạp</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 leading-snug">
                    <MapPin size={12} className="text-brand shrink-0" />
                    {booking.cinemaName || 'Hệ thống Rạp CinemaPass'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">Ngày chiếu</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar size={12} className="text-brand-gold" />
                    {(booking.startTime || booking.showtime?.startTime) ? parseApiDate(booking.startTime || booking.showtime!.startTime).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">Giờ chiếu</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock size={12} className="text-brand-gold" />
                    {(booking.startTime || booking.showtime?.startTime) ? parseApiDate(booking.startTime || booking.showtime!.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">Phòng chiếu</span>
                  <span className="text-xs font-bold text-white leading-none">
                    {booking.hallName || booking.showtime?.hall?.name || 'Hall 1'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">Ghế đã chọn</span>
                  <span className="text-xs font-black text-brand-gold leading-none">
                    {booking.seats?.join(', ') || booking.bookingSeats?.map(bs => `${bs.seat?.rowName || ''}${bs.seat?.seatNumber || ''}`).join(', ') || ''}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">Mã đặt vé</span>
                  <span className="text-xs font-bold font-mono text-white leading-none uppercase tracking-wider">
                    {booking.bookingCode}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">Trạng thái</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getStatusColor(booking.bookingStatus)}`}>
                    {booking.bookingStatus === 'Confirmed' ? 'Đã xác nhận' : booking.bookingStatus === 'CheckedIn' ? 'Đã Check-in' : booking.bookingStatus === 'Cancelled' ? 'Đã hủy' : 'Chờ thanh toán'}
                  </span>
                </div>

              </div>

              {/* Dotted Tear line for Desktop */}
              <div className="hidden md:flex flex-col items-center justify-between self-stretch px-2 relative">
                {/* Notch top punch */}
                <div className="w-6 h-6 rounded-full bg-[#07070a] border border-white/5 absolute -top-11 -translate-x-1/2" />
                <div className="w-[1px] h-full border-l border-dashed border-white/10" />
                {/* Notch bottom punch */}
                <div className="w-6 h-6 rounded-full bg-[#07070a] border border-white/5 absolute -bottom-11 -translate-x-1/2" />
              </div>

              {/* Dotted Tear line for Mobile */}
              <div className="flex md:hidden w-full items-center justify-between py-2 relative">
                {/* Notch left punch */}
                <div className="w-6 h-6 rounded-full bg-[#07070a] border border-white/5 absolute -left-9 -translate-y-1/2" />
                <div className="h-[1px] w-full border-t border-dashed border-white/10" />
                {/* Notch right punch */}
                <div className="w-6 h-6 rounded-full bg-[#07070a] border border-white/5 absolute -right-9 -translate-y-1/2" />
              </div>

              {/* QR stub control panel */}
              <div className="w-full md:w-2/5 flex flex-col items-center justify-center p-2 text-center">
                <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mb-3">Vé Vào Cửa Phòng Chiếu</span>

                {/* Animated QR frame */}
                <div className="relative p-4 bg-white rounded-2xl w-36 h-36 flex items-center justify-center shadow-lg group overflow-hidden select-none">
                  {booking.bookingStatus === 'Confirmed' || booking.bookingStatus === 'CheckedIn' ? (
                    <>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/booking/' + booking.bookingId)}`}
                        alt="QR Check-in"
                        className="w-32 h-32 object-contain"
                      />
                      {/* Laser scan animation overlay */}
                      <motion.div
                        animate={{ top: ['0%', '90%', '0%'] }}
                        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                        className="absolute left-0 right-0 h-[2px] bg-brand shadow-[0_0_10px_#e50914] z-10 opacity-70 pointer-events-none"
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-gray-400">
                      <QrCode size={40} className="stroke-[1.5]" />
                      <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Bị khóa</span>
                    </div>
                  )}
                </div>

                <span className="text-[8px] text-gray-400 mt-3 font-semibold block max-w-[150px]">
                  Vui lòng xuất trình mã QR này cho nhân viên tại cửa phòng chiếu.
                </span>
              </div>

            </div>
          </motion.div>
        </div>

        {/* Sidebar Controls & Invoice details */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Admin Check-in control panel */}
          {isAdmin && (
            <GlassCard className="p-6 border-purple-500/30 bg-purple-500/5 shadow-[0_0_30px_rgba(168,85,247,0.05)] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-purple-500/10 pb-2">
                <h3 className="text-xs font-black text-purple-300 uppercase tracking-widest">
                  Admin Check-in
                </h3>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-black uppercase">
                  Staff only
                </span>
              </div>

              {booking.bookingStatus === 'Confirmed' ? (
                <>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Vé này hợp lệ và sẵn sàng để check-in. Vui lòng xác nhận thông tin khách hàng trước khi bấm nút.
                  </p>
                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  >
                    {isCheckingIn ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <QrCode size={14} />
                    )}
                    Xác nhận Check-in vé
                  </button>
                </>
              ) : booking.bookingStatus === 'CheckedIn' ? (
                <div className="text-center py-2 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-xs font-black text-purple-400 uppercase tracking-wider block">
                    Đã Check-in thành công
                  </span>
                  <p className="text-[9px] text-gray-500 leading-normal">
                    Vé đã được sử dụng để vào cửa rạp chiếu.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-brand leading-normal font-semibold">
                  Vé không ở trạng thái có thể check-in (hiện tại: {booking.bookingStatus}).
                </p>
              )}
            </GlassCard>
          )}

          <GlassCard className="p-6 border-white/5 flex flex-col gap-3">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Dịch vụ vé</h3>
            
            {booking.bookingStatus === 'Pending' && (
              <button
                onClick={() => navigate(`/payment?bookingId=${booking.bookingId}`)}
                className="w-full py-3 bg-brand-gold hover:bg-brand-gold/90 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/15 mb-2"
              >
                Thanh toán ngay
              </button>
            )}

            <button
              onClick={handleDownloadPNG}
              disabled={isDownloading || (booking.bookingStatus !== 'Confirmed' && booking.bookingStatus !== 'CheckedIn')}
              className="w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-45 disabled:pointer-events-none text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Tải ảnh vé
            </button>

            <button
              onClick={() => window.print()}
              disabled={booking.bookingStatus !== 'Confirmed' && booking.bookingStatus !== 'CheckedIn'}
              className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:opacity-45 text-white border border-white/10 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer size={14} />
              In vé / Xuất PDF
            </button>

            <button
              onClick={handleShare}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Share2 size={14} />
              Chia sẻ liên kết
            </button>
          </GlassCard>

          {/* Pricing receipt details */}
          <GlassCard className="p-6 border-white/5 flex flex-col gap-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Chi tiết hóa đơn</h3>

            <div className="flex flex-col gap-2.5 text-xs text-gray-400 font-semibold">
              <div className="flex justify-between">
                <span>Tổng giá vé gốc</span>
                <span className="text-white">{(booking.totalAmount - booking.serviceFee + booking.discountAmount).toLocaleString()} VND</span>
              </div>
              <div className="flex justify-between">
                <span>Phí dịch vụ hệ thống</span>
                <span className="text-white">{(booking.serviceFee).toLocaleString()} VND</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Giảm giá khuyến mãi</span>
                  <span>-{(booking.discountAmount).toLocaleString()} VND</span>
                </div>
              )}
              <div className="h-[1px] bg-white/5 my-1" />
              <div className="flex justify-between text-sm font-black text-white">
                <span className="uppercase tracking-wider">Tổng tiền đã thanh toán</span>
                <span className="text-brand-gold">{(booking.totalAmount).toLocaleString()} VND</span>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
              <Info size={14} className="text-brand-gold shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-500 leading-normal">
                Vé đã mua không thể hoàn trả hoặc đổi lịch. Vui lòng đến rạp trước suất chiếu ít nhất 15 phút.
              </p>
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
};
