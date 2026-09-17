import React from 'react';
import { Modal, Tooltip } from 'antd';
import {
  Calendar,
  Film,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import type { ApiShowtime, ApiPrice, NormalizedMovie, MappedHall } from '../../../types/showtime';
import type { Cinema } from '../../../types';
import { apiClient, getImageUrl } from '../../../api/client';

interface ShowtimeFormModalProps {
  isOpen: boolean;
  selectedShowtime: ApiShowtime | null;
  form: {
    movieId: number;
    cinemaId: number;
    hallId: number;
    priceId: number;
    startTime: string;
    format: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    movieId: number;
    cinemaId: number;
    hallId: number;
    priceId: number;
    startTime: string;
    format: string;
  }>>;
  movies: NormalizedMovie[];
  cinemas: Cinema[];
  halls: MappedHall[];
  dbPrices: ApiPrice[];
  loadingHalls: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formCalculations: {
    duration: number;
    ads: number;
    cleaning: number;
    total: number;
    endTime: string;
    totalEndTime: string;
    conflictError: string | null;
  } | null;
  loadHallsForCinema: (cinemaId: number, preserveHallId?: number) => Promise<void>;
}

// ==========================================
// 🛠️ Pure Helpers
// ==========================================

export const getFormatFromPrice = (priceId: number, pricesList: ApiPrice[]): string => {
  const price = pricesList.find(p => p.priceId === priceId);
  if (!price) return '2D';

  let typeStr = '';
  if (price.ticketType.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(price.ticketType);
      typeStr = (obj.roomType || obj.hallType || '').toUpperCase();
    } catch {
      // fallback
    }
  }
  if (!typeStr) {
    typeStr = (price.ticketType || '').toUpperCase();
  }

  if (typeStr.includes('IMAX')) return 'IMAX';
  if (typeStr.includes('3D')) return '3D';
  return '2D';
};

export const isPriceCompatibleWithFormat = (price: ApiPrice, format: string): boolean => {
  const priceFormat = getFormatFromPrice(price.priceId, [price]);
  return priceFormat === format;
};

export const validateFormat = (
  movie: NormalizedMovie | undefined,
  hall: MappedHall | undefined,
  format: string
): string | null => {
  if (!movie || !hall) return null;
  const movieFormats = movie.movieFormats || [];
  const movieHasFormat = movieFormats.length === 0 || movieFormats.some(f => f.formatName === format);
  const hallHasFormat = hall.supportedFormats?.includes(format) ?? true;

  if (!movieHasFormat) {
    return `Phim "${movie.title}" không hỗ trợ định dạng chiếu ${format}.`;
  }
  if (!hallHasFormat) {
    return `Phòng chiếu "${hall.name}" không tương thích định dạng ${format}.`;
  }
  return null;
};

// ==========================================
// 🚀 Main ShowtimeFormModal Component
// ==========================================

export const ShowtimeFormModal: React.FC<ShowtimeFormModalProps> = React.memo(({
  isOpen,
  selectedShowtime,
  form,
  setForm,
  movies,
  cinemas,
  halls,
  dbPrices,
  loadingHalls,
  saving,
  onCancel,
  onSubmit,
  formCalculations,
  loadHallsForCinema
}) => {

  // 1. Select currently active movie and hall
  const selectedMovie = React.useMemo(() => {
    return movies.find(m => m.movieId === form.movieId);
  }, [movies, form.movieId]);

  const selectableMovies = React.useMemo(() => {
    return movies.filter(m => m.status !== 'Hidden' || m.movieId === form.movieId);
  }, [movies, form.movieId]);

  const movieFormats = React.useMemo(() => {
    return selectedMovie?.movieFormats || [];
  }, [selectedMovie]);

  const selectedHall = React.useMemo(() => {
    return halls.find(h => h.hallId === form.hallId);
  }, [halls, form.hallId]);

  // Filter halls to the currently selected cinema only
  const currentCinemaHalls = React.useMemo(() => {
    return halls.filter(h => h.cinemaId === form.cinemaId);
  }, [halls, form.cinemaId]);

  // Derive format mismatch warnings
  const formatError = React.useMemo(() => {
    return validateFormat(selectedMovie, selectedHall, form.format);
  }, [selectedMovie, selectedHall, form.format]);

  // ==========================================
  // 🎯 User Handlers
  // ==========================================

  const handleMovieChange = (movieId: number) => {
    const nextMovie = movies.find(m => m.movieId === movieId);
    const formats = nextMovie?.movieFormats || [];
    const defaultFormat = formats.length > 0 ? formats[0].formatName : '2D';

    const validPrices = dbPrices.filter(p => isPriceCompatibleWithFormat(p, defaultFormat));
    const nextPriceId = validPrices.length > 0 ? validPrices[0].priceId : form.priceId;

    const allowedHalls = halls.filter(h => h.cinemaId === form.cinemaId && h.supportedFormats?.includes(defaultFormat));
    let nextHallId = form.hallId;
    if (allowedHalls.length > 0 && !allowedHalls.some(h => h.hallId === form.hallId)) {
      nextHallId = allowedHalls[0].hallId;
    } else if (allowedHalls.length === 0) {
      nextHallId = 0;
    }

    setForm(prev => ({
      ...prev,
      movieId,
      format: defaultFormat,
      priceId: nextPriceId,
      hallId: nextHallId
    }));
  };

  const handleFormatChange = (newFormat: string) => {
    const validPrices = dbPrices.filter(p => isPriceCompatibleWithFormat(p, newFormat));
    const nextPriceId = validPrices.length > 0 ? validPrices[0].priceId : form.priceId;

    const allowedHalls = halls.filter(h => h.cinemaId === form.cinemaId && h.supportedFormats?.includes(newFormat));
    let nextHallId = form.hallId;
    if (allowedHalls.length > 0 && !allowedHalls.some(h => h.hallId === form.hallId)) {
      nextHallId = allowedHalls[0].hallId;
    } else if (allowedHalls.length === 0) {
      nextHallId = 0;
    }

    setForm(prev => ({
      ...prev,
      format: newFormat,
      priceId: nextPriceId,
      hallId: nextHallId
    }));
  };

  // ==========================================
  // 🔀 Controlled State Syncs
  // ==========================================

  // Sync format to priceId when modal loads or priceId changes
  React.useEffect(() => {
    if (isOpen && form.priceId && dbPrices.length > 0) {
      const currentFormat = getFormatFromPrice(form.priceId, dbPrices);
      if (form.format !== currentFormat) {
        setForm(prev => ({
          ...prev,
          format: currentFormat
        }));
      }
    }
  }, [isOpen, form.priceId, dbPrices]);

  // Sync format and price when the selected movie changes or on initial open
  React.useEffect(() => {
    if (isOpen && selectedMovie && dbPrices.length > 0) {
      const formats = selectedMovie.movieFormats || [];
      const isFormatSupported = formats.length === 0 || formats.some(f => f.formatName === form.format);
      
      if (!isFormatSupported && formats.length > 0) {
        const defaultFormat = formats[0].formatName;
        const validPrices = dbPrices.filter(p => isPriceCompatibleWithFormat(p, defaultFormat));
        const nextPriceId = validPrices.length > 0 ? validPrices[0].priceId : form.priceId;
        
        setForm(prev => ({
          ...prev,
          format: defaultFormat,
          priceId: nextPriceId
        }));
      }
    }
  }, [isOpen, form.movieId, dbPrices, selectedMovie]);

  // Sync hall to a compatible one if the current selection is incompatible
  React.useEffect(() => {
    if (isOpen && currentCinemaHalls.length > 0 && form.hallId) {
      const currentHall = currentCinemaHalls.find(h => h.hallId === form.hallId);
      if (currentHall && !currentHall.supportedFormats?.includes(form.format)) {
        const firstCompatible = currentCinemaHalls.find(h => h.supportedFormats?.includes(form.format));
        setForm(prev => ({
          ...prev,
          hallId: firstCompatible ? firstCompatible.hallId : currentCinemaHalls[0].hallId
        }));
      }
    }
  }, [isOpen, currentCinemaHalls, form.format, form.hallId]);

  // ==========================================
  // 💰 Pricing Engine Live Estimations
  // ==========================================

  const [pricingPreview, setPricingPreview] = React.useState<{
    standardPrice: number;
    vipPrice: number;
    couplePrice: number;
    ruleStandard: any | null;
    ruleVip: any | null;
    ruleCouple: any | null;
    breakdownStandard: string[];
    breakdownVip: string[];
    breakdownCouple: string[];
    availableStandard: boolean;
    availableVip: boolean;
    availableCouple: boolean;
    loading: boolean;
  }>({
    standardPrice: 0,
    vipPrice: 0,
    couplePrice: 0,
    ruleStandard: null,
    ruleVip: null,
    ruleCouple: null,
    breakdownStandard: [],
    breakdownVip: [],
    breakdownCouple: [],
    availableStandard: true,
    availableVip: true,
    availableCouple: true,
    loading: false
  });

  React.useEffect(() => {
    if (!isOpen || !form.hallId || !form.movieId || !form.startTime) {
      return;
    }

    const handler = setTimeout(async () => {
      setPricingPreview(prev => ({ ...prev, loading: true }));
      try {
        const [stdRes, vipRes, coupleRes] = await Promise.all([
          apiClient.post('/pricing/compute', {
            seatType: 'STANDARD',
            hallId: form.hallId,
            movieId: form.movieId,
            startTime: form.startTime
          }),
          apiClient.post('/pricing/compute', {
            seatType: 'VIP',
            hallId: form.hallId,
            movieId: form.movieId,
            startTime: form.startTime
          }),
          apiClient.post('/pricing/compute', {
            seatType: 'COUPLE',
            hallId: form.hallId,
            movieId: form.movieId,
            startTime: form.startTime
          })
        ]);

        setPricingPreview({
          standardPrice: stdRes.data?.data?.finalPrice || 0,
          vipPrice: vipRes.data?.data?.finalPrice || 0,
          couplePrice: coupleRes.data?.data?.finalPrice || 0,
          ruleStandard: stdRes.data?.data?.matchedRule || null,
          ruleVip: vipRes.data?.data?.matchedRule || null,
          ruleCouple: coupleRes.data?.data?.matchedRule || null,
          breakdownStandard: stdRes.data?.data?.breakdown || [],
          breakdownVip: vipRes.data?.data?.breakdown || [],
          breakdownCouple: coupleRes.data?.data?.breakdown || [],
          availableStandard: stdRes.data?.data?.isSeatTypeAvailable ?? true,
          availableVip: vipRes.data?.data?.isSeatTypeAvailable ?? true,
          availableCouple: coupleRes.data?.data?.isSeatTypeAvailable ?? true,
          loading: false
        });
      } catch (err) {
        console.error('Failed to compute pricing preview:', err);
        setPricingPreview(prev => ({ ...prev, loading: false }));
      }
    }, 350);

    return () => {
      clearTimeout(handler);
    };
  }, [isOpen, form.hallId, form.movieId, form.startTime]);

  return (
    <Modal
      open={isOpen}
      onCancel={onCancel}
      footer={null}
      title={null}
      closeIcon={null}
      width={980}
      centered
      className="dark-theme-modal ticket-price-modal"
    >
      <div className="relative text-left text-gray-200">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Calendar size={16} className="text-red-500" />
            </span>
            {selectedShowtime ? 'Chỉnh Sửa Suất Chiếu' : 'Cấu Hình Suất Chiếu Mới'}
          </h2>
          <button
            onClick={onCancel}
            className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
          >
            ✕ Đóng
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* LEFT COLUMN */}
            <div className="space-y-4">

              {/* Section 1: Movie Information */}
              <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-[#FFD54A] flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#FFD54A]/10 text-[#FFD54A] flex items-center justify-center text-[10px]">1</span>
                  Thông tin phim &amp; Định dạng
                </span>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">Phim lựa chọn</label>
                      <select
                        value={form.movieId}
                        onChange={(e) => handleMovieChange(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0d111a] border border-white/10 px-3 py-2 text-xs font-semibold text-white rounded-lg focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        {selectableMovies.map(m => (
                          <option key={m.movieId} value={m.movieId}>{m.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">Định dạng chiếu (Format)</label>
                      <select
                        value={form.format}
                        onChange={(e) => handleFormatChange(e.target.value)}
                        className="w-full bg-[#0d111a] border border-white/10 px-3 py-2 text-xs font-semibold text-white rounded-lg focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        {movieFormats.length === 0 ? (
                          <option value="2D">2D (Mặc định)</option>
                        ) : (
                          movieFormats.map(fmt => (
                            <option key={fmt.movieFormatId} value={fmt.formatName}>
                              {fmt.formatName}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="w-24 h-32 bg-[#0d111a] border border-white/5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedMovie?.posterUrl ? (
                      <img
                        src={getImageUrl(selectedMovie.posterUrl)}
                        alt="Poster"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film size={24} className="text-gray-600" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs border-t border-white/5">
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-bold">Thời lượng</span>
                    <span className="font-semibold text-white">{selectedMovie?.duration || 120} phút</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-bold">Thể loại</span>
                    <span className="font-semibold text-white truncate block">{selectedMovie?.genreName || 'Chưa phân loại'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Cinema & Hall Selection */}
              <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-[#FFD54A] flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#FFD54A]/10 text-[#FFD54A] flex items-center justify-center text-[10px]">2</span>
                  Địa điểm &amp; Phòng chiếu
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Cụm rạp</label>
                    <select
                      value={form.cinemaId}
                      onChange={(e) => {
                        const cinemaId = parseInt(e.target.value) || 0;
                        setForm(prev => ({ ...prev, cinemaId, hallId: 0 }));
                        loadHallsForCinema(cinemaId);
                      }}
                      className="w-full bg-[#0d111a] border border-white/10 px-3 py-2 text-xs font-semibold text-white rounded-lg focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value={0}>-- Chọn cụm rạp --</option>
                      {cinemas.map(c => (
                        <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold flex items-center justify-between mb-1">
                      Phòng chiếu
                      {loadingHalls && <Loader2 size={11} className="animate-spin text-red-500" />}
                    </label>
                    <select
                      value={form.hallId}
                      onChange={(e) => setForm(prev => ({ ...prev, hallId: parseInt(e.target.value) || 0 }))}
                      disabled={loadingHalls || currentCinemaHalls.length === 0}
                      className="w-full bg-[#0d111a] border border-white/10 px-3 py-2 text-xs font-semibold text-white rounded-lg focus:outline-none focus:border-red-500 disabled:opacity-40 cursor-pointer"
                    >
                      <option value={0}>-- Chọn phòng chiếu --</option>
                      {currentCinemaHalls.map(h => {
                        const isCompatible = h.supportedFormats?.includes(form.format);
                        return (
                          <option
                            key={h.hallId}
                            value={h.hallId}
                            disabled={!isCompatible}
                            className={!isCompatible ? 'text-gray-500 bg-red-950/20' : ''}
                          >
                            {h.name} ({h.hallTypeName}){!isCompatible ? ` - Không hỗ trợ ${form.format}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">

              {/* Section 3: Time Scheduling */}
              <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-[#FFD54A] flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#FFD54A]/10 text-[#FFD54A] flex items-center justify-center text-[10px]">3</span>
                  Thời gian xếp lịch
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Giờ bắt đầu suất chiếu</label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        required
                        value={form.startTime}
                        onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full bg-[#0d111a] border border-white/10 px-3 py-2 text-xs font-semibold text-white rounded-lg focus:outline-none focus:border-red-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {formCalculations ? (
                    <div className="bg-white/1 border border-white/5 p-3 rounded-lg text-xs space-y-1.5">
                      <div className="flex justify-between text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> Kết thúc phim:</span>
                        <span className="font-mono font-bold text-white">{formCalculations.endTime}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Dọn dẹp &amp; Vệ sinh:</span>
                        <span className="font-mono">+15 phút</span>
                      </div>
                      <div className="flex justify-between text-[#FFD54A] font-bold border-t border-white/5 pt-1.5 mt-1">
                        <span>Thời gian chiếm phòng:</span>
                        <span className="font-mono">{formCalculations.totalEndTime}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/1 border border-white/5 p-3 rounded-lg text-xs text-gray-500 italic text-center">
                      Vui lòng điền mốc giờ bắt đầu suất chiếu...
                    </div>
                  )}

                  {/* Red Alert - Format Incompatibility */}
                  {formatError && (
                    <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex gap-2 items-center text-xs text-red-400 font-semibold text-left">
                      <AlertTriangle size={14} className="shrink-0 text-red-500" />
                      <span>{formatError}</span>
                    </div>
                  )}

                  {/* Red Alert - Showtime Overlaps */}
                  {formCalculations?.conflictError && (
                    <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex gap-2 items-center text-xs text-red-400 font-semibold text-left">
                      <AlertTriangle size={14} className="shrink-0 text-red-500" />
                      <span>{formCalculations.conflictError}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Section 4: Live Pricing Preview */}
          <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-[#FFD54A] flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-[#FFD54A]/10 text-[#FFD54A] flex items-center justify-center text-[10px]">4</span>
                Ước tính giá vé tương lai (Pricing Engine)
              </span>
              <Tooltip title="Giá vé được tính toán theo thời gian thực dựa trên các bộ luật tính giá của rạp chiếu đã tạo.">
                <HelpCircle size={14} className="text-gray-500 cursor-help" />
              </Tooltip>
            </div>

            {pricingPreview.loading ? (
              <div className="flex items-center justify-center gap-2.5 py-8 text-xs text-gray-400 bg-white/1 rounded-lg border border-white/5">
                <Loader2 size={16} className="animate-spin text-red-500" />
                Đang đối sánh dữ liệu giá vé...
              </div>
            ) : !form.hallId ? (
              <div className="py-8 text-center text-xs text-gray-500 italic bg-white/1 rounded-lg border border-white/5">
                Chọn phòng chiếu để xem trước cấu trúc giá vé chi tiết.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* STANDARD CARD */}
                {/* STANDARD CARD */}
                <div className={pricingPreview.availableStandard ? "bg-white/3 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between" : "bg-white/1 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between opacity-40 grayscale select-none"}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 rounded-full bg-white/10 text-white">STANDARD</span>
                      {!pricingPreview.availableStandard ? (
                        <span className="text-[9px] text-red-400 font-bold">Không có ghế này</span>
                      ) : pricingPreview.ruleStandard ? (
                        <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Rule #{pricingPreview.ruleStandard.id}
                        </span>
                      ) : (
                        <span className="text-[9px] text-yellow-400 font-bold">Fallback</span>
                      )}
                    </div>

                    <div className="text-lg font-black text-white font-mono">
                      {pricingPreview.availableStandard ? `${pricingPreview.standardPrice.toLocaleString()}đ` : "Không có"}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 mt-3 text-[9px] text-gray-400">
                    <span className="font-bold text-white block mb-1">Các bước tính giá:</span>
                    {pricingPreview.availableStandard ? (
                      <ul className="list-disc pl-3.5 space-y-1">
                        {pricingPreview.breakdownStandard.map((line, idx) => (
                          <li key={idx} className="leading-normal">{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="italic text-gray-500">Phòng chiếu không chứa loại ghế này.</span>
                    )}
                  </div>
                </div>

                {/* VIP CARD */}
                <div className={pricingPreview.availableVip ? "bg-[#b38f00]/5 border border-[#b38f00]/20 rounded-xl p-3.5 flex flex-col justify-between" : "bg-white/1 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between opacity-40 grayscale select-none"}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">VIP SEAT</span>
                      {!pricingPreview.availableVip ? (
                        <span className="text-[9px] text-red-400 font-bold">Không có ghế này</span>
                      ) : pricingPreview.ruleVip ? (
                        <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Rule #{pricingPreview.ruleVip.id}
                        </span>
                      ) : (
                        <span className="text-[9px] text-yellow-400 font-bold">Fallback</span>
                      )}
                    </div>

                    <div className="text-lg font-black text-amber-400 font-mono">
                      {pricingPreview.availableVip ? `${pricingPreview.vipPrice.toLocaleString()}đ` : "Không có"}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 mt-3 text-[9px] text-gray-400">
                    <span className="font-bold text-amber-400 block mb-1">Các bước tính giá:</span>
                    {pricingPreview.availableVip ? (
                      <ul className="list-disc pl-3.5 space-y-1">
                        {pricingPreview.breakdownVip.map((line, idx) => (
                          <li key={idx} className="leading-normal">{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="italic text-gray-500">Phòng chiếu không chứa loại ghế này.</span>
                    )}
                  </div>
                </div>

                {/* COUPLE CARD */}
                <div className={pricingPreview.availableCouple ? "bg-[#cc0066]/5 border border-[#cc0066]/20 rounded-xl p-3.5 flex flex-col justify-between" : "bg-white/1 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between opacity-40 grayscale select-none"}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">COUPLE SEAT</span>
                      {!pricingPreview.availableCouple ? (
                        <span className="text-[9px] text-red-400 font-bold">Không có ghế này</span>
                      ) : pricingPreview.ruleCouple ? (
                        <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Rule #{pricingPreview.ruleCouple.id}
                        </span>
                      ) : (
                        <span className="text-[9px] text-yellow-400 font-bold">Fallback</span>
                      )}
                    </div>

                    <div className="text-lg font-black text-pink-400 font-mono">
                      {pricingPreview.availableCouple ? `${pricingPreview.couplePrice.toLocaleString()}đ` : "Không có"}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 mt-3 text-[9px] text-gray-400">
                    <span className="font-bold text-pink-400 block mb-1">Các bước tính giá:</span>
                    {pricingPreview.availableCouple ? (
                      <ul className="list-disc pl-3.5 space-y-1">
                        {pricingPreview.breakdownCouple.map((line, idx) => (
                          <li key={idx} className="leading-normal">{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="italic text-gray-500">Phòng chiếu không chứa loại ghế này.</span>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 border-t border-white/5 pt-4 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 text-xs font-bold border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(239,68,68,0.25)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={saving || loadingHalls || currentCinemaHalls.length === 0 || !form.hallId || !!formCalculations?.conflictError || !!formatError}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {selectedShowtime ? 'Lưu thay đổi' : 'Tạo suất chiếu'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
});

ShowtimeFormModal.displayName = 'ShowtimeFormModal';
