import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { Booking } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { Ticket, Calendar, Clock, QrCode } from 'lucide-react';

export const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<any>('/bookings/my-bookings')
      .then((res) => {
        const responseData = res.data?.data ?? res.data;
        const bookingItems = Array.isArray(responseData) ? responseData : responseData?.items ?? [];
        // Sort by CreatedAt descending
        const sorted = bookingItems.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setBookings(sorted);
      })
      .catch((err) => console.error("Error loading bookings", err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Cancelled':
        return 'bg-brand/10 text-brand border-brand/20';
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'Đã xác nhận';
      case 'Cancelled':
        return 'Đã hủy';
      default:
        return 'Chờ thanh toán';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 select-none text-left min-h-screen">
      <h2 className="text-xl font-extrabold text-white mb-8 border-b border-white/5 pb-4 flex items-center gap-2">
        <Ticket className="text-brand" /> Lịch Sử Đặt Vé
      </h2>

      {loading ? (
        <div className="flex flex-col gap-6">
          <SkeletonLoader className="h-44 w-full rounded-2xl animate-pulse" />
          <SkeletonLoader className="h-44 w-full rounded-2xl animate-pulse" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 glass-panel rounded-3xl text-center text-gray-500 flex flex-col items-center justify-center gap-3">
          <Ticket size={48} className="text-gray-700 animate-pulse" />
          <span className="text-sm font-semibold">Bạn chưa có giao dịch đặt vé nào</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {bookings.map((booking) => (
            <GlassCard
              key={booking.bookingId}
              className="border border-white/5 hover:border-white/10 flex flex-col md:flex-row gap-6 p-6"
            >
              {/* Left detail grid */}
              <div className="flex-grow flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-gray-500">
                    MÃ VÉ: {booking.bookingCode}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(
                    booking.bookingStatus
                  )}`}>
                    {getStatusLabel(booking.bookingStatus)}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {booking.movieTitle || booking.showtime?.movie?.title || 'Unknown Film'}
                  </h3>
                  <span className="text-xs text-gray-500 block mt-1">
                    Cinema Pass Complex • Hall {booking.hallName || booking.showtime?.hall?.name || 'A'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-400 border-t border-white/5 pt-4">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Ngày</span>
                    <span className="text-gray-300 flex items-center gap-1">
                      <Calendar size={12} />
                      {(booking.startTime || booking.showtime?.startTime) ? new Date(booking.startTime || booking.showtime!.startTime).toLocaleDateString('vi-VN') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Giờ</span>
                    <span className="text-gray-300 flex items-center gap-1">
                      <Clock size={12} />
                      {(booking.startTime || booking.showtime?.startTime) ? new Date(booking.startTime || booking.showtime!.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Ghế</span>
                    <span className="text-brand-gold text-xs truncate block max-w-xs">
                      {booking.seats?.join(', ') || booking.bookingSeats?.map(bs => `${bs.seat?.rowName || ''}${bs.seat?.seatNumber || ''}`).join(', ') || ''}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs font-bold text-gray-500">
                  <span>Thời gian đặt: {new Date(booking.createdAt).toLocaleString('vi-VN')}</span>
                  <span className="text-sm font-extrabold text-white">
                    {(booking.totalAmount).toLocaleString()} VND
                  </span>
                </div>
              </div>

              {/* Right Col: QR Ticket Code (only if confirmed) */}
              {booking.bookingStatus === 'Confirmed' && (
                <div className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-white/10 md:w-36 md:h-36 self-center shrink-0">
                  {booking.qrCodeUrl ? (
                    <img
                      src={booking.qrCodeUrl}
                      alt="Ticket QR Code"
                      className="w-28 h-28 object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <QrCode size={36} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-center text-gray-500">QR CODE</span>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
