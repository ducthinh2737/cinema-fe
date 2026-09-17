import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearBooking } from '../../store/bookingSlice';
import { apiClient, getImageUrl } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { CheckCircle2, XCircle, Loader2, AlertCircle, Clock3 } from 'lucide-react';
import { motion } from 'framer-motion';

// Premium Center-Burst Physics Confetti Component
const Confetti: React.FC = () => {
  const colors = ['#e50914', '#e5a93b', '#3b82f6', '#10b981', '#a855f7', '#ff69b4'];
  const shapes = ['circle', 'square', 'triangle'];

  // Generate 65 particles for a beautiful splash effect
  const particles = Array.from({ length: 65 }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 200 + 80; // Outward velocity range
    const x1 = Math.cos(angle) * distance;
    const y1 = Math.sin(angle) * distance;

    // Falling down under gravity with horizontal drift
    const x2 = x1 + (Math.random() - 0.5) * 100;
    const y2 = y1 + Math.random() * 350 + 200;

    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.random() * 8 + 6;
    const duration = Math.random() * 1.6 + 1.4;
    const delay = Math.random() * 0.08;

    return {
      id: i,
      x: [0, x1, x2],
      y: [0, y1, y2],
      rotate: [0, Math.random() * 720 - 360],
      scale: [0.2, 1.2, 0.3],
      opacity: [0, 1, 1, 0],
      duration,
      delay,
      color,
      shape,
      size,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {particles.map((p) => {
        let borderRadius = '0px';
        if (p.shape === 'circle') borderRadius = '50%';
        else if (p.shape === 'square') borderRadius = '3px';

        const style: React.CSSProperties = {
          position: 'fixed',
          left: '50%',
          top: '35%',
          width: `${p.size}px`,
          height: `${p.size}px`,
          backgroundColor: p.shape !== 'triangle' ? p.color : 'transparent',
          borderRadius,
          zIndex: 9999,
          marginLeft: `-${p.size / 2}px`,
          marginTop: `-${p.size / 2}px`,
        };

        if (p.shape === 'triangle') {
          style.width = '0px';
          style.height = '0px';
          style.borderLeft = `${p.size / 2}px solid transparent`;
          style.borderRight = `${p.size / 2}px solid transparent`;
          style.borderBottom = `${p.size}px solid ${p.color}`;
        }

        return (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, rotate: 0, scale: 0.2, opacity: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              rotate: p.rotate,
              scale: p.scale,
              opacity: p.opacity,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.1, 0.8, 0.25, 1], // snappy explosion then drop
            }}
            style={style}
          />
        );
      })}
    </div>
  );
};

type ResultStatus = 'loading' | 'success' | 'pending' | 'failed';

export const PaymentResult: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const [status, setStatus] = useState<ResultStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [details, setDetails] = useState<any>(null);

  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    // Clear booking state from store
    dispatch(clearBooking());

    const searchParams = new URLSearchParams(location.search);
    const bookingIdStr = searchParams.get('bookingId');
    if (!bookingIdStr) {
      setStatus('failed');
      setErrorMessage('Không tìm thấy thông tin đặt vé.');
      return;
    }

    const bookingId = parseInt(bookingIdStr, 10);
    if (isNaN(bookingId)) {
      setStatus('failed');
      setErrorMessage('Mã đặt vé không hợp lệ.');
      return;
    }

    // Call API GET booking details to verify status
    apiClient.get(`/bookings/${bookingId}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (!data) {
          setStatus('failed');
          setErrorMessage('Không lấy được dữ liệu chi tiết vé.');
          return;
        }

        if (data.bookingStatus === 'Confirmed' || data.bookingStatus === 'Paid') {
          setStatus('success');
          setDetails(data);
          showToast('Tải thông tin vé thành công!', 'success');
        } else if (data.bookingStatus === 'Cancelled' || data.bookingStatus === 'Expired') {
          setStatus('failed');
          setDetails(data);
          setErrorMessage('Vé đã bị hủy hoặc hết hạn thanh toán (vượt quá 5 phút giữ ghế).');
        } else {
          // Still pending — the transfer may simply not have been matched yet.
          // This is not a failure, so it gets its own neutral state rather than the red "failed" treatment.
          setStatus('pending');
          setDetails(data);
          setErrorMessage('Giao dịch chưa được hoàn tất. Vui lòng chuyển khoản đúng nội dung và chờ Admin xác nhận.');
        }
      })
      .catch((err) => {
        setStatus('failed');
        const msg = err.response?.data?.Message || 'Lấy chi tiết giao dịch thất bại.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      });
  }, [location, dispatch, showToast]);

  return (
    <div className="max-w-lg mx-auto px-6 py-16 min-h-[85vh] flex flex-col justify-center select-none text-center relative overflow-hidden">

      {/* Trigger Confetti on Success */}
      {status === 'success' && <Confetti />}

      <GlassCard className="border border-white/5 flex flex-col items-center gap-6 p-8 relative overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.03)]">

        {/* Subtle decorative neon indicator top border */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

        {status === 'loading' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-brand-gold animate-spin" />
            <h2 className="text-lg font-black text-white tracking-wide">Đang xác thực trạng thái thanh toán</h2>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-sans">
              Vui lòng không tải lại trang. Chúng tôi đang truy xuất dữ liệu vé từ cơ sở dữ liệu.
            </p>
          </div>
        )}

        {status === 'success' && details && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
            className="w-full flex flex-col items-center gap-6"
          >
            <motion.div
              variants={{
                hidden: { scale: 0, rotate: -30 },
                visible: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } }
              }}
              className="p-3.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full"
            >
              <CheckCircle2 size={32} className="text-green-400" />
            </motion.div>

            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
              }}
            >
              <h2 className="text-xl font-black text-white tracking-wide uppercase">Thanh toán thành công</h2>

            </motion.div>

            {/* CINEMA TICKET PREVIEW CARD */}
            <motion.div
              variants={{
                hidden: { y: 40, opacity: 0 },
                visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
              }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#1b1c22] to-[#121318] border border-white/5 rounded-3xl p-6 overflow-hidden text-left shadow-2xl"
            >
              {/* Notched circle left */}
              <div className="absolute left-[-10px] top-[60%] w-5 h-5 bg-background rounded-full border-r border-white/5 z-20" />
              {/* Notched circle right */}
              <div className="absolute right-[-10px] top-[60%] w-5 h-5 bg-background rounded-full border-l border-white/5 z-20" />

              <div className="flex gap-4">
                <img
                  src={getImageUrl(details.moviePosterUrl || details.showtime?.movie?.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=150'}
                  alt="Poster"
                  className="w-16 h-22 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="flex flex-col gap-1 justify-center">
                  <h4 className="text-sm font-extrabold text-white leading-tight line-clamp-2">
                    {details.movieTitle || details.showtime?.movie?.title || 'Phim đã chọn'}
                  </h4>
                  <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                    {details.showtime?.hall?.cinema?.cinemaName || 'Cinema Pass Gold'}
                  </span>
                  <div className="text-[9px] text-gray-400 font-semibold mt-0.5">
                    Phòng: {details.hallName || details.showtime?.hall?.name || 'A'} • {details.showtime?.hall?.hallTypeName || 'IMAX'}
                  </div>
                </div>
              </div>

              {/* Dashed division separator line */}
              <div className="border-t border-dashed border-white/10 my-4 relative" />

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] font-semibold text-gray-400">
                <div>
                  <span className="text-gray-600 block text-[9px] uppercase tracking-wider mb-0.5 font-bold">Ngày chiếu</span>
                  <span className="text-gray-300 font-bold">
                    {details.startTime ? new Date(details.startTime).toLocaleDateString('vi-VN') : 'Hôm nay'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[9px] uppercase tracking-wider mb-0.5 font-bold">Giờ chiếu</span>
                  <span className="text-gray-300 font-bold font-mono">
                    {details.startTime ? new Date(details.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '00:00'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[9px] uppercase tracking-wider mb-0.5 font-bold">Ghế ngồi</span>
                  <span className="text-brand-gold font-bold">
                    {details.seats && details.seats.length > 0 ? details.seats.join(', ') : 'A1'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[9px] uppercase tracking-wider mb-0.5 font-bold">Mã đặt vé</span>
                  <span className="text-gray-200 font-bold uppercase tracking-widest font-mono">{details.bookingCode || 'CP-PNDG'}</span>
                </div>
              </div>

              {/* Embedded QR Code ticket */}
              <div className="flex flex-col items-center justify-center gap-1.5 mt-6 pt-4 border-t border-white/5 text-center">
                {details.bookingId ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/booking/' + details.bookingId)}`}
                    alt="QR Ticket"
                    className="w-24 h-24 bg-white p-1 rounded-lg border border-white/10 shrink-0 select-none"
                  />
                ) : (
                  <div className="w-20 h-20 bg-white p-1 rounded-lg border border-white/10 shrink-0 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#07070a]" />
                  </div>
                )}
                <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-1">Quét mã QR tại cổng để vào rạp</span>
              </div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
              }}
              className="flex flex-col sm:flex-row gap-3 w-full mt-2"
            >
              <Button variant="primary" fullWidth size="lg" onClick={() => navigate(`/profile?tab=bookings`)}>
                Lịch sử đặt vé
              </Button>
              <Button variant="secondary" fullWidth size="lg" onClick={() => navigate('/')}>
                Quay lại trang chủ
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Pending — the transfer hasn't been matched yet. Distinct from "failed":
            amber/neutral treatment instead of red, no bounce animation, and a retry path
            instead of only a dead end back to home. */}
        {status === 'pending' && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
              <Clock3 size={32} />
            </div>

            <div>
              <h2 className="text-xl font-black text-white tracking-wide uppercase">Đang chờ xác nhận</h2>
              <p className="text-xs text-amber-400/90 font-bold flex items-center justify-center gap-1 mt-1 font-sans">
                <AlertCircle size={12} /> Chưa ghi nhận giao dịch chuyển khoản
              </p>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-sans max-w-sm">
              {errorMessage || 'Giao dịch chưa được hoàn tất. Vui lòng chuyển khoản đúng nội dung và chờ hệ thống xác nhận.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
              <Button variant="primary" fullWidth size="lg" onClick={() => window.location.reload()}>
                Kiểm tra lại
              </Button>
              <Button variant="secondary" fullWidth size="lg" onClick={() => navigate('/')}>
                Quay lại trang chủ
              </Button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
              <XCircle size={32} />
            </div>

            <div>
              <h2 className="text-xl font-black text-white tracking-wide uppercase">Thanh toán chưa hoàn tất</h2>
              <p className="text-xs text-red-400/90 font-bold flex items-center justify-center gap-1 mt-1 font-sans">
                <AlertCircle size={12} /> Giao dịch thất bại hoặc đã bị hủy
              </p>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-sans max-w-sm">
              {errorMessage || 'Giao dịch đặt vé không khả dụng hoặc đã hết thời gian thanh toán (5 phút giữ ghế).'}
            </p>

            <div className="flex flex-col gap-3 w-full mt-4">
              <Button variant="primary" fullWidth size="lg" onClick={() => navigate('/')}>
                Quay lại trang chủ
              </Button>
            </div>
          </div>
        )}

      </GlassCard>
    </div>
  );
};