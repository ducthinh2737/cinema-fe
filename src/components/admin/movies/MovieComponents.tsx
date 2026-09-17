import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, X, AlertCircle, AlertTriangle, Loader2, Search, Filter, 
  Sparkles, Film, Calendar, Clock, TrendingUp, DollarSign, Edit3, Trash2, Eye, Play 
} from 'lucide-react';
import { getImageUrl } from '../../../api/client';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area 
} from 'recharts';
import { Button } from '../../ui/Button';
import type { Movie, Genre } from '../../../types';
import { getAgeRatingCode as getAgeRatingCodeHelper } from '../../../utils/ageRatingHelpers';

// ==========================================
// 1. MOVIE STATUS BADGE Component & Types
// ==========================================
export type MovieStatus = 'NowShowing' | 'ComingSoon' | 'Ended' | 'Hidden';

interface MovieStatusBadgeProps {
  status: MovieStatus;
}

export const MovieStatusBadge: React.FC<MovieStatusBadgeProps> = ({ status }) => {
  const configs = {
    NowShowing: {
      label: 'Đang Chiếu',
      styles: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      dot: 'bg-emerald-400 animate-pulse'
    },
    ComingSoon: {
      label: 'Sắp Chiếu',
      styles: 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      dot: 'bg-blue-400'
    },
    Ended: {
      label: 'Đã Kết Thúc',
      styles: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
      dot: 'bg-gray-400'
    },
    Hidden: {
      label: 'Đang Ẩn',
      styles: 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
      dot: 'bg-rose-400'
    }
  };

  const current = configs[status] || configs.NowShowing;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${current.styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};

// ==========================================
// 2. MOVIE SKELETON Loader Component
// ==========================================
interface MovieSkeletonProps {
  viewType: 'table' | 'grid';
  count?: number;
}

export const MovieSkeleton: React.FC<MovieSkeletonProps> = ({ viewType, count = 5 }) => {
  if (viewType === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="bg-[#0e0e12]/60 border border-white/5 rounded-3xl p-4 flex flex-col gap-4 animate-pulse">
            <div className="aspect-[2/3] w-full bg-white/5 rounded-2xl" />
            <div className="h-4 bg-white/5 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
            <div className="h-3 bg-white/5 rounded w-1/3" />
            <div className="flex gap-2 justify-end mt-2">
              <div className="h-8 w-16 bg-white/5 rounded-lg" />
              <div className="h-8 w-8 bg-white/5 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 animate-pulse">
      <div className="overflow-hidden border border-white/5 bg-[#0e0e12]/30 rounded-2xl">
        <div className="h-12 bg-white/[0.02] border-b border-white/5 w-full" />
        <div className="divide-y divide-white/5">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-14 bg-white/5 rounded-lg shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 bg-white/5 rounded w-48" />
                  <div className="h-3 bg-white/5 rounded w-24" />
                </div>
              </div>
              <div className="h-4 bg-white/5 rounded w-16 hidden md:block" />
              <div className="h-4 bg-white/5 rounded w-12 hidden md:block" />
              <div className="h-6 bg-white/5 rounded-full w-20" />
              <div className="h-8 bg-white/5 rounded w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. MOVIE UPLOAD Dropzone Component
// ==========================================
interface MovieUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File) => void;
  aspectRatio?: 'poster' | 'backdrop';
  onPreview?: () => void;
}

export const MovieUpload: React.FC<MovieUploadProps> = ({
  label,
  value,
  onChange,
  onFileSelect,
  aspectRatio = 'poster',
  onPreview
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string>('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotate, setCropRotate] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const simulateUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Tệp quá lớn. Kích thước tối đa là 5MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPendingImageUrl(objectUrl);
    setShowCropModal(true); // Open the premium crop editor
  };

  const handleConfirmCrop = () => {
    setShowCropModal(false);
    setUploading(true);
    setProgress(0);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 25;
      if (currentProgress >= 100) {
        clearInterval(interval);
        setProgress(100);
        setUploading(false);
        onChange(pendingImageUrl);
        if (onFileSelect && selectedFile) {
          onFileSelect(selectedFile);
        }
      } else {
        setProgress(currentProgress);
      }
    }, 120);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateUpload(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const containerClasses = aspectRatio === 'poster' 
    ? 'w-full aspect-[2/3] max-w-[180px]' 
    : 'w-full aspect-[16/9]';

  return (
    <div className="flex flex-col gap-2 text-left">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</span>
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={(e) => {
          if (value && onPreview) {
            e.stopPropagation();
            onPreview();
          } else {
            fileInputRef.current?.click();
          }
        }}
        className={`relative ${containerClasses} rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
          isDragActive 
            ? 'border-brand bg-brand/5' 
            : value 
              ? 'border-white/10 bg-[#121216]' 
              : 'border-white/5 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div 
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" className="stroke-white/5 fill-transparent" strokeWidth="3" />
                  <circle cx="24" cy="24" r="20" className="stroke-brand fill-transparent" strokeWidth="3" strokeDasharray="125" strokeDashoffset={125 - (125 * progress) / 100} />
                </svg>
                <span className="absolute text-[10px] font-black text-white">{progress}%</span>
              </div>
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider mt-3">Đang lưu ảnh...</span>
            </motion.div>
          ) : value ? (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group relative w-full h-full"
            >
              <img src={getImageUrl(value)} alt="Upload preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs"
                onClick={(e) => {
                  if (onPreview) {
                    e.stopPropagation();
                    onPreview();
                  }
                }}
              >
                <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white hover:scale-110 transition-transform cursor-pointer border border-white/10 flex items-center justify-center">
                  <Eye size={16} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/90">Xem chi tiết</span>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-brand hover:bg-brand/90 text-white p-1 rounded-full shadow-lg hover:scale-115 transition-all cursor-pointer border border-brand/20 flex items-center justify-center"
                  title="Xóa ảnh"
                >
                  <X size={10} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2.5 p-4 text-center text-gray-500"
            >
              <div className="h-10 w-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                <UploadCloud size={18} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Kéo thả hoặc click</span>
                <span className="text-[8px] font-bold text-gray-600">PNG, JPG tối đa 5MB</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand uppercase tracking-wider mt-1">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}

      {/* Image Crop Modal Overlay */}
      <AnimatePresence>
        {showCropModal && (
          <div className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121217] border border-white/10 rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 text-left shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-xs font-black text-white uppercase tracking-wider">Cắt & Chỉnh sửa ảnh</span>
                <button type="button" onClick={() => setShowCropModal(false)} className="text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Crop Box Container */}
              <div className="w-full aspect-[4/3] bg-black border border-white/5 rounded-xl relative overflow-hidden flex items-center justify-center">
                <div 
                  className={`border-2 border-dashed border-brand-gold/60 pointer-events-none z-10 absolute ${
                    aspectRatio === 'poster' ? 'h-[85%] aspect-[2/3]' : 'w-[85%] aspect-[16/9]'
                  }`} 
                />
                <img 
                  src={pendingImageUrl} 
                  alt="Crop Target" 
                  style={{
                    transform: `scale(${cropZoom}) rotate(${cropRotate}deg)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain filter brightness-95 opacity-80"
                />
              </div>

              {/* Sliders */}
              <div className="flex flex-col gap-4 text-xs font-bold text-gray-400">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>Phóng to: {cropZoom.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="0.1" 
                    value={cropZoom} 
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="w-full accent-brand cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>Xoay: {cropRotate}°</span>
                  </div>
                  <input 
                    type="range" 
                    min="-180" 
                    max="180" 
                    step="5" 
                    value={cropRotate} 
                    onChange={(e) => setCropRotate(parseInt(e.target.value))}
                    className="w-full accent-brand cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="flex-1 py-3 border border-white/5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="flex-1 py-3 bg-brand text-white rounded-xl text-xs font-black uppercase transition-all cursor-pointer shadow-lg shadow-brand/20"
                >
                  Xác nhận Crop
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 4. REVENUE CHART Component & Types
// ==========================================
export interface RevenueData {
  name: string;
  revenue: number;
  tickets: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  type?: 'revenue' | 'tickets';
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, type = 'revenue' }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0e0e12] border border-white/10 p-3 rounded-xl shadow-2xl text-left select-none">
          <p className="text-[10px] font-black text-white uppercase tracking-wider mb-1.5">{label}</p>
          {type === 'revenue' ? (
            <p className="text-xs font-black text-brand-gold">
              Doanh thu: <span className="font-mono">{payload[0].value.toLocaleString('vi-VN')}đ</span>
            </p>
          ) : (
            <p className="text-xs font-black text-brand">
              Vé bán ra: <span className="font-mono">{payload[0].value.toLocaleString('vi-VN')} vé</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'revenue' ? (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e5a93b" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#e5a93b" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
            <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
            <Bar dataKey="revenue" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]} maxBarSize={30} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ticketsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e02424" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#e02424" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
            <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="tickets" stroke="#e02424" strokeWidth={2} fillOpacity={1} fill="url(#ticketsGrad)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// ==========================================
// 5. MOVIE ANALYTICS Counters Component
// ==========================================
interface MovieAnalyticsProps {
  totalMovies: number;
  nowShowing: number;
  comingSoon: number;
  mostBookedMovie: string;
  totalRevenue: number;
}

export const MovieAnalytics: React.FC<MovieAnalyticsProps> = ({
  totalMovies,
  nowShowing,
  comingSoon,
  mostBookedMovie,
  totalRevenue,
}) => {
  const cards = [
    {
      label: 'Tổng Phim',
      value: totalMovies,
      desc: 'Trong cơ sở dữ liệu',
      icon: Film,
      colorClass: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
    },
    {
      label: 'Đang Chiếu',
      value: nowShowing,
      desc: 'Tại hệ thống rạp',
      icon: TrendingUp,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      label: 'Sắp Khởi Chiếu',
      value: comingSoon,
      desc: 'Được lên lịch sớm',
      icon: Calendar,
      colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    },
    {
      label: 'Phim Hot Nhất',
      value: mostBookedMovie || 'N/A',
      desc: 'Có lượt vé đặt nhiều nhất',
      icon: Sparkles,
      colorClass: 'text-brand-gold bg-brand-gold/10 border-brand-gold/20'
    },
    {
      label: 'Doanh Thu Phim',
      value: `${(totalRevenue / 1_000_000).toFixed(1)}M đ`,
      desc: 'Từ trước đến nay',
      icon: DollarSign,
      colorClass: 'text-brand bg-brand/10 border-brand/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 select-none text-left">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[#0c0c12]/45 border border-white/5 p-4 rounded-3xl flex flex-col gap-3 relative overflow-hidden group hover:border-white/10 transition-colors"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.01] group-hover:bg-white/[0.02] rounded-full blur-2xl pointer-events-none transition-colors" />
            <div className="flex justify-between items-center gap-3">
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">{card.label}</span>
              <div className={`p-2 rounded-xl border shrink-0 ${card.colorClass}`}>
                <Icon size={14} />
              </div>
            </div>
            <div className="flex flex-col gap-0.5 mt-1 min-w-0">
              <span className="text-lg md:text-xl font-black text-white truncate leading-none uppercase">{card.value}</span>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-1 truncate">{card.desc}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ==========================================
// 6. MOVIE FILTERS Selector Component
// ==========================================
interface MovieFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedGenreId: number | '';
  onGenreChange: (id: number | '') => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  selectedAgeRating: string;
  onAgeRatingChange: (age: string) => void;
  isFeatured: boolean | '';
  onFeaturedChange: (featured: boolean | '') => void;
  genres: Genre[];
}

export const MovieFilters: React.FC<MovieFiltersProps> = ({
  search,
  onSearchChange,
  selectedGenreId,
  onGenreChange,
  selectedStatus,
  onStatusChange,
  selectedLanguage,
  onLanguageChange,
  selectedCountry,
  onCountryChange,
  selectedAgeRating,
  onAgeRatingChange,
  isFeatured,
  onFeaturedChange,
  genres,
}) => {
  return (
    <div className="bg-[#0c0c12]/40 border border-white/5 p-5 rounded-3xl flex flex-col gap-4 select-none text-left backdrop-blur-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên phim..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#0e0e12]/60 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#0e0e12]/60 border border-white/5 px-3 rounded-xl">
          <Filter size={14} className="text-gray-500 shrink-0" />
          <select
            value={selectedGenreId}
            onChange={(e) => onGenreChange(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full py-3 bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Tất Cả Thể Loại</option>
            {genres.map(g => (
              <option key={g.genreId} value={g.genreId} className="bg-[#121217]">
                {g.genreName || g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-[#0e0e12]/60 border border-white/5 px-3 rounded-xl">
          <Filter size={14} className="text-gray-500 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full py-3 bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Tất Cả Trạng Thái</option>
            <option value="NowShowing" className="bg-[#121217]">Đang Chiếu</option>
            <option value="ComingSoon" className="bg-[#121217]">Sắp Chiếu</option>
            <option value="Ended" className="bg-[#121217]">Đã Kết Thúc</option>
            <option value="Hidden" className="bg-[#121217]">Đang Ẩn</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-[#0e0e12]/60 border border-white/5 px-3 rounded-xl">
          <Filter size={14} className="text-gray-500 shrink-0" />
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full py-3 bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Mọi Ngôn Ngữ</option>
            <option value="Tiếng Việt" className="bg-[#121217]">Tiếng Việt</option>
            <option value="English" className="bg-[#121217]">Tiếng Anh (English)</option>
            <option value="Korean" className="bg-[#121217]">Tiếng Hàn</option>
            <option value="Japanese" className="bg-[#121217]">Tiếng Nhật</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-[#0e0e12]/60 border border-white/5 px-3 rounded-xl">
          <Filter size={14} className="text-gray-500 shrink-0" />
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full py-3 bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Mọi Quốc Gia</option>
            <option value="Việt Nam" className="bg-[#121217]">Việt Nam</option>
            <option value="Mỹ" className="bg-[#121217]">Mỹ (USA)</option>
            <option value="Hàn Quốc" className="bg-[#121217]">Hàn Quốc</option>
            <option value="Nhật Bản" className="bg-[#121217]">Nhật Bản</option>
            <option value="Trung Quốc" className="bg-[#121217]">Trung Quốc</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-[#0e0e12]/60 border border-white/5 px-3 rounded-xl">
          <Filter size={14} className="text-gray-500 shrink-0" />
          <select
            value={selectedAgeRating}
            onChange={(e) => onAgeRatingChange(e.target.value)}
            className="w-full py-3 bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Mọi Độ Tuổi</option>
            <option value="P" className="bg-[#121217]">P - Mọi độ tuổi</option>
            <option value="K" className="bg-[#121217]">K - Dưới 13 kèm người lớn</option>
            <option value="T13" className="bg-[#121217]">T13 - Trên 13 tuổi</option>
            <option value="T16" className="bg-[#121217]">T16 - Trên 16 tuổi</option>
            <option value="T18" className="bg-[#121217]">T18 - Trên 18 tuổi</option>
            <option value="C18" className="bg-[#121217]">C18 - Cấm dưới 18 tuổi</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-white/5 mt-1">
        <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
          <Sparkles size={11} className="text-brand-gold" /> Bộ lọc nhanh:
        </span>
        <button
          onClick={() => onFeaturedChange(isFeatured === true ? '' : true)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
            isFeatured === true
              ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold shadow-[0_0_15px_rgba(229,169,59,0.1)]'
              : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
          }`}
        >
          Phim Nổi Bật (Featured)
        </button>
        <button
          onClick={() => {
            onSearchChange('');
            onGenreChange('');
            onStatusChange('');
            onLanguageChange('');
            onCountryChange('');
            onAgeRatingChange('');
            onFeaturedChange('');
          }}
          className="text-[10px] text-gray-500 hover:text-brand font-black uppercase tracking-wider ml-auto cursor-pointer"
        >
          Xóa Bộ Lọc
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 7. ADMIN MOVIE CARD Component
// ==========================================
interface AdminMovieCardProps {
  movie: Movie;
  onEdit: (movie: Movie) => void;
  onDelete: (id: number) => void;
  onSelect: (movie: Movie) => void;
  onManageShowtimes?: (movie: Movie) => void;
  status: MovieStatus;
  bookingCount?: number;
  revenue?: number;
}

export const AdminMovieCard: React.FC<AdminMovieCardProps> = ({
  movie,
  onEdit,
  onDelete,
  onSelect,
  onManageShowtimes,
  status,
  bookingCount = 0,
  revenue = 0,
}) => {
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const embedUrl = getYoutubeEmbedUrl(movie.trailerUrl);

  const getAgeRatingCode = (ratingId?: number) => {
    return getAgeRatingCodeHelper(ratingId);
  };

  const ageCode = getAgeRatingCode((movie as any).ageRatingId);

  return (
    <>
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        className="bg-[#0c0c12]/45 border border-white/5 hover:border-brand-gold/30 hover:shadow-[0_0_25px_rgba(229,169,59,0.08)] rounded-3xl p-4 flex flex-col gap-4 shadow-xl select-none text-left relative overflow-hidden group transition-all duration-500"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-brand-gold/8 transition-colors duration-500" />
        
        {/* Movie Poster & Interactive Layer */}
        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-[#07070a] shadow-inner cursor-pointer" onClick={() => onSelect(movie)}>
          <img
            src={movie.posterUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=150'}
            alt={movie.title}
            className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 group-hover:brightness-50 transition-all duration-700"
          />
          
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 border border-white/10 rounded-lg text-[9px] font-black text-brand-gold font-sans backdrop-blur-sm shadow-md">
            {ageCode}
          </div>

          {embedUrl && (
            <div 
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={(e) => {
                e.stopPropagation();
                setShowTrailerModal(true);
              }}
            >
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-12 h-12 bg-brand text-white rounded-full flex items-center justify-center shadow-lg shadow-brand/40 border border-brand-gold/20"
              >
                <Play size={16} fill="white" className="ml-1" />
              </motion.div>
            </div>
          )}
        </div>

        <div className="flex-grow flex flex-col gap-1 min-w-0" onClick={() => onSelect(movie)}>
          <div className="flex flex-wrap items-center gap-1.5">
            <MovieStatusBadge status={status} />
            {(movie as any).isFeatured && (
              <span className="bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                <Sparkles size={8} /> Hot
              </span>
            )}
            <span className="bg-white/5 border border-white/5 text-gray-400 text-[8px] font-bold px-2 py-0.5 rounded">
              {movie.language || 'English'}
            </span>
          </div>

          <h4 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors line-clamp-2 leading-snug uppercase tracking-tight mt-1">
            {movie.title}
          </h4>

          <div className="flex justify-between items-center mt-0.5">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">
              {movie.genreName || movie.genre?.genreName || 'Chưa Phân Loại'}
            </span>
            <span className="text-[9px] text-brand-gold/80 font-bold uppercase tracking-wider">
              {(movie as any).country || 'USA'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 text-gray-400">
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <Clock size={11} className="text-brand-gold" />
            <span>{movie.duration} phút</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold justify-end">
            <Calendar size={11} className="text-brand" />
            <span className="font-mono">{new Date(movie.releaseDate).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/[0.01] border border-white/5 p-2.5 rounded-2xl text-[10px] font-bold">
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 uppercase text-[8px]">Đã Bán</span>
            <span className="text-white font-mono">{bookingCount.toLocaleString('vi-VN')} vé</span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-gray-500 uppercase text-[8px]">Doanh Thu</span>
            <span className="text-brand-gold font-mono">{(revenue).toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(movie)}
              className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Chi Tiết"
            >
              <Eye size={12} /> Chi Tiết
            </button>
            {onManageShowtimes && (
              <button
                onClick={() => onManageShowtimes(movie)}
                className="text-[9px] font-black uppercase tracking-widest text-brand-gold hover:text-brand-gold-hover flex items-center gap-1 cursor-pointer transition-colors ml-1"
                title="Lịch Chiếu"
              >
                <Calendar size={11} /> Lịch Chiếu
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(movie)}
              className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
              title="Sửa thông tin"
            >
              <Edit3 size={11} />
            </button>
            <button
              onClick={() => onDelete(movie.id)}
              className="p-2 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer"
              title="Xóa phim"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Trailer Video Player Dialog */}
      <AnimatePresence>
        {showTrailerModal && embedUrl && (
          <div 
            className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowTrailerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button" 
                onClick={() => setShowTrailerModal(false)} 
                className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/85 border border-white/10 text-white p-2 rounded-full cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>

              <iframe
                src={embedUrl}
                title="Trailer Review Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

// ==========================================
// 8. DELETE MOVIE CONFIRM MODAL Component
// ==========================================
interface DeleteMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  movieTitle: string;
  loading?: boolean;
}

export const DeleteMovieModal: React.FC<DeleteMovieModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  movieTitle,
  loading = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#121217] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center flex flex-col gap-5 items-center select-none"
          >
            <div className="h-12 w-12 bg-brand/10 border border-brand/20 text-brand rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Xác Nhận Xóa Phim</h3>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                Bạn có chắc chắn muốn xóa phim <span className="text-white font-black">"{movieTitle}"</span> khỏi hệ thống? 
                Hành động này sẽ xóa các suất chiếu liên quan và không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={onClose}
                disabled={loading}
                className="text-xs font-bold uppercase py-3 rounded-xl"
              >
                Giữ Lại Phim
              </Button>
              <Button 
                variant="primary" 
                fullWidth 
                onClick={onConfirm}
                disabled={loading}
                className="bg-brand hover:bg-brand/90 font-black text-xs uppercase py-3 rounded-xl shadow-lg shadow-brand/20"
              >
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Xóa Phim'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
