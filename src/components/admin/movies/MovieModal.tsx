import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertTriangle, Loader2, Play, Film, Plus } from 'lucide-react';
import { MovieUpload } from './MovieComponents';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { apiClient } from '../../../api/client';
import type { Movie, Genre } from '../../../types';

const convertToSlug = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const movieSchema = z.object({
  title: z.string().min(1, 'Tên phim không được để trống'),
  englishTitle: z.string().optional().default(''),
  slug: z.string().min(1, 'Slug không được để trống'),
  shortDescription: z.string().optional().default(''),
  description: z.string().optional().default(''),
  duration: z.coerce.number().min(1, 'Thời lượng phải lớn hơn 0'),
  language: z.string().min(1, 'Ngôn ngữ không được để trống'),
  releaseDate: z.string().min(1, 'Vui lòng chọn ngày khởi chiếu'),
  endDate: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
  rating: z.coerce.number().min(0, 'Đánh giá tối thiểu là 0').max(10, 'Đánh giá tối đa là 10'),
  genreId: z.coerce.number().min(1, 'Vui lòng chọn thể loại'),
  posterUrl: z.string().optional().default(''),
  bannerUrl: z.string().optional().default(''),
  trailerUrl: z.string().optional().default(''),
  isFeatured: z.boolean().default(false),
  status: z.enum(['NowShowing', 'ComingSoon', 'Ended', 'Hidden']).default('NowShowing'),
  
  // Extra properties
  country: z.string().optional().default('Mỹ'),
  ageRatingId: z.coerce.number().default(1),
  director: z.string().optional().default(''),
  actors: z.array(z.string()).optional().default([]),
  
  // SEO fields
  metaTitle: z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
  keywords: z.string().optional().default(''),
  canonicalUrl: z.string().optional().default('')
});

interface MovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any, posterFile?: File | null, bannerFile?: File | null) => Promise<any>;
  selectedMovie: Movie | null;
  genres: Genre[];
  saving: boolean;
  defaultTab?: 'info' | 'media' | 'specs' | 'showtimes';
}

export const MovieModal: React.FC<MovieModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedMovie,
  genres,
  saving,
  defaultTab
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'media' | 'specs' | 'showtimes'>('info');
  const [showDiscardWarning, setShowDiscardWarning] = useState(false);
  const [showDetailPreview, setShowDetailPreview] = useState(false);
  const [actorInput, setActorInput] = useState('');
  
  // Showtimes state
  const [cinemas, setCinemas] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(false);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | ''>('');
  const [selectedHallId, setSelectedHallId] = useState<number | ''>('');
  const [showtimeStartTime, setShowtimeStartTime] = useState('');
  const [showtimePriceId, setShowtimePriceId] = useState<number>(1);
  const [savingShowtime, setSavingShowtime] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [dbPrices, setDbPrices] = useState<any[]>([]);
  const [dbLanguages, setDbLanguages] = useState<any[]>([]);
  const [dbAgeRatings, setDbAgeRatings] = useState<any[]>([]);

  // Format price configurations nicely for admin selection
  const formatTicketType = (ticketTypeStr: string) => {
    if (!ticketTypeStr) return 'Vé thường';
    
    if (ticketTypeStr.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(ticketTypeStr);
        const seatMap: Record<string, string> = {
          'Standard': 'Thường',
          'VIP': 'VIP',
          'Couple': 'Đôi',
          'Sweetbox': 'Sweetbox'
        };
        const roomMap: Record<string, string> = {
          '2D': '2D',
          '3D': '3D',
          'IMAX': 'IMAX',
          '4DX': '4DX'
        };
        const dayMap: Record<string, string> = {
          'Weekday': 'Ngày thường',
          'Weekend': 'Cuối tuần',
          'Holiday': 'Ngày lễ'
        };
        const slotMap: Record<string, string> = {
          'Morning': 'Sáng',
          'Afternoon': 'Chiều',
          'Evening': 'Tối'
        };

        const seat = seatMap[obj.seatType] || obj.seatType || '';
        const room = roomMap[obj.roomType] || obj.roomType || '';
        const day = dayMap[obj.dayType] || obj.dayType || '';
        const slot = slotMap[obj.timeSlot] || obj.timeSlot || '';

        const parts = [seat, room, day, slot].filter(Boolean);
        return parts.join(' - ') || 'Vé thường';
      } catch (e) {
        console.warn('Failed to parse ticketType JSON:', e);
      }
    }
    
    const legacyMap: Record<string, string> = {
      'Standard Weekday': 'Thường - Ngày thường',
      'VIP Weekday': 'VIP - Ngày thường',
      'Standard Weekend': 'Thường - Cuối tuần',
      'VIP Weekend': 'VIP - Cuối tuần',
    };
    return legacyMap[ticketTypeStr] || ticketTypeStr;
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm<any>({
    resolver: zodResolver(movieSchema),
    defaultValues: {
      title: '',
      englishTitle: '',
      slug: '',
      shortDescription: '',
      description: '',
      duration: 120,
      language: 'English',
      releaseDate: '',
      endDate: '',
      rating: 5,
      genreId: 1,
      posterUrl: '',
      bannerUrl: '',
      trailerUrl: '',
      isFeatured: false,
      status: 'NowShowing',
      country: 'Mỹ',
      ageRatingId: 1,
      director: '',
      actors: [],
      metaTitle: '',
      metaDescription: '',
      keywords: '',
      canonicalUrl: ''
    }
  });

  const watchTitle = watch('title');
  const watchTrailerUrl = watch('trailerUrl');
  const watchActors = watch('actors') || [];

  // Auto-slug generation
  useEffect(() => {
    if (watchTitle && !selectedMovie) {
      const slugified = convertToSlug(watchTitle);
      setValue('slug', slugified, { shouldDirty: true });
    }
  }, [watchTitle, selectedMovie, setValue]);

  // Load showtimes & reference data
  useEffect(() => {
    if (isOpen && selectedMovie) {
      // Load cinemas
      apiClient.get('/cinemas', { params: { PageSize: 50 } }).then(res => {
        const rawData = res.data?.data ?? res.data;
        const data = Array.isArray(rawData) ? rawData : (rawData?.items && Array.isArray(rawData.items)) ? rawData.items : [];
        setCinemas(data.map((c: any) => ({
          cinemaId: c.cinemaId,
          name: c.cinemaName ?? c.name,
        })));
      }).catch(err => console.error('Failed to fetch cinemas', err));

      // Load showtimes
      setLoadingShowtimes(true);
      apiClient.get('/showtimes', { params: { MovieId: selectedMovie.id, PageSize: 100 } }).then(res => {
        const rawData = res.data?.data ?? res.data;
        const data = Array.isArray(rawData) ? rawData : (rawData?.items && Array.isArray(rawData.items)) ? rawData.items : [];
        setShowtimes(data);
      }).catch(err => console.error('Failed to fetch showtimes', err))
        .finally(() => setLoadingShowtimes(false));
    } else {
      setShowtimes([]);
      setCinemas([]);
    }
  }, [isOpen, selectedMovie]);

  // Load prices, languages, and age ratings dynamically from database
  useEffect(() => {
    if (isOpen) {
      apiClient.get('/prices')
        .then(res => {
          const data = res.data || [];
          setDbPrices(data);
          if (data.length > 0) {
            setShowtimePriceId(data[0].priceId);
          }
        })
        .catch(err => {
          console.error('Failed to fetch prices in MovieModal', err);
          setDbPrices([
            { priceId: 1, ticketType: 'Thường (Ngày thường)', value: 80000 },
            { priceId: 2, ticketType: 'VIP (Ngày thường)', value: 100000 },
            { priceId: 3, ticketType: 'Bom Tấn (Cuối tuần)', value: 120000 },
          ]);
          setShowtimePriceId(1);
        });

      apiClient.get('/languages')
        .then(res => {
          const data = res.data || [];
          setDbLanguages(data.filter((l: any) => !l.isDeleted));
        })
        .catch(err => {
          console.error('Failed to fetch languages in MovieModal', err);
          setDbLanguages([
            { languageId: 1, languageName: 'Tiếng Việt' },
            { languageId: 2, languageName: 'English' },
            { languageId: 3, languageName: 'Korean' },
            { languageId: 4, languageName: 'Japanese' }
          ]);
        });

      apiClient.get('/ageratings')
        .then(res => {
          const data = res.data || [];
          setDbAgeRatings(data.filter((r: any) => !r.isDeleted));
        })
        .catch(err => {
          console.error('Failed to fetch age ratings in MovieModal', err);
          setDbAgeRatings([
            { ageRatingId: 1, ratingCode: 'P', description: 'Mọi lứa tuổi' },
            { ageRatingId: 2, ratingCode: 'K', description: 'Học sinh kèm người lớn' },
            { ageRatingId: 3, ratingCode: 'T13', description: 'Cấm dưới 13 tuổi' },
            { ageRatingId: 4, ratingCode: 'T16', description: 'Cấm dưới 16 tuổi' },
            { ageRatingId: 5, ratingCode: 'T18', description: 'Cấm dưới 18 tuổi' },
            { ageRatingId: 6, ratingCode: 'C18', description: 'Dành riêng cho người lớn' }
          ]);
        });
    } else {
      setDbPrices([]);
      setDbLanguages([]);
      setDbAgeRatings([]);
    }
  }, [isOpen]);

  // Load form values & local storage metadata
  useEffect(() => {
    if (isOpen) {
      setPosterFile(null);
      setBannerFile(null);
      const baseValues = selectedMovie ? {
        title: selectedMovie.title,
        duration: selectedMovie.duration,
        language: selectedMovie.language,
        releaseDate: selectedMovie.releaseDate.split('T')[0],
        endDate: selectedMovie.endDate.split('T')[0],
        rating: selectedMovie.rating,
        genreId: selectedMovie.genreId,
        posterUrl: selectedMovie.posterUrl || '',
        bannerUrl: selectedMovie.bannerUrl || '',
        trailerUrl: selectedMovie.trailerUrl || '',
        description: selectedMovie.description || '',
        isFeatured: (selectedMovie as any).isFeatured || false,
        status: (selectedMovie as any).status || 'NowShowing',
        ageRatingId: (selectedMovie as any).ageRatingId || 1,
      } : {
        title: '',
        duration: 120,
        language: 'Tiếng Việt',
        releaseDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        rating: 8.0,
        genreId: genres[0]?.genreId || 1,
        posterUrl: '',
        bannerUrl: '',
        trailerUrl: '',
        description: '',
        isFeatured: false,
        status: 'NowShowing',
        ageRatingId: 1,
      };

      // Read local storage metadata
      const movieKey = selectedMovie ? `movie_meta_${selectedMovie.id}` : 'movie_meta_temp';
      const metaStr = localStorage.getItem(movieKey);
      let localMeta = {
        englishTitle: selectedMovie ? selectedMovie.title : '',
        slug: selectedMovie ? selectedMovie.slug : '',
        shortDescription: '',
        country: 'Việt Nam',
        director: '',
        actors: [] as string[],
        metaTitle: '',
        metaDescription: '',
        keywords: '',
        canonicalUrl: ''
      };

      if (metaStr) {
        try {
          localMeta = { ...localMeta, ...JSON.parse(metaStr) };
        } catch (e) {
          console.error(e);
        }
      }

      reset({
        ...baseValues,
        ...localMeta
      });

      setActiveTab(defaultTab || 'info');
      setShowDiscardWarning(false);
      setActorInput('');
      setSelectedCinemaId('');
      setHalls([]);
      setShowtimeStartTime('');
    }
  }, [selectedMovie, isOpen, reset, genres, defaultTab]);

  // Handle cinema select change for showtimes tab
  const handleCinemaSelect = async (cinemaId: number | '') => {
    setSelectedCinemaId(cinemaId);
    setSelectedHallId('');
    if (!cinemaId) {
      setHalls([]);
      return;
    }
    setLoadingHalls(true);
    try {
      const response = await apiClient.get(`/cinemas/${cinemaId}/halls`);
      const data = response.data?.data ?? response.data ?? [];
      setHalls(data.map((h: any) => ({
        hallId: h.hallId,
        name: h.hallName ?? h.name,
        hallTypeName: h.hallTypeName
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHalls(false);
    }
  };

  // Add showtime directly
  const handleCreateShowtime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovie) return;
    if (!selectedHallId) return;
    if (!showtimeStartTime) return;

    setSavingShowtime(true);
    try {
      const formattedTime = new Date(showtimeStartTime).toISOString();
      const payload = {
        movieId: selectedMovie.id,
        hallId: parseInt(selectedHallId.toString()),
        priceId: showtimePriceId,
        startTime: formattedTime
      };

      await apiClient.post('/showtimes', payload);
      
      // Reload
      const res = await apiClient.get('/showtimes', { params: { MovieId: selectedMovie.id, PageSize: 100 } });
      const data = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
      setShowtimes(data);

      setShowtimeStartTime('');
      setSelectedCinemaId('');
      setHalls([]);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.Message || 'Trùng lịch chiếu hoặc phòng chiếu đã bận.');
    } finally {
      setSavingShowtime(false);
    }
  };

  // Delete showtime
  const handleDeleteShowtime = async (showtimeId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch chiếu này không?')) return;
    try {
      await apiClient.delete(`/showtimes/${showtimeId}`);
      setShowtimes(prev => prev.filter(s => s.showtimeId !== showtimeId));
    } catch (err) {
      console.error(err);
      alert('Không thể xóa lịch chiếu.');
    }
  };

  // Close attempt handler
  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardWarning(true);
    } else {
      onClose();
    }
  };

  // Submit values
  const onSubmit = async (values: any) => {
    const slugified = values.slug || convertToSlug(values.title);

    const apiPayload = {
      ...values,
      slug: slugified,
      description: values.shortDescription || ''
    };

    // 1. Save standard fields via callback
    const savedMovie = await onSave(apiPayload, posterFile, bannerFile);

    // 2. Save metadata locally
    const metaData = {
      englishTitle: values.englishTitle,
      slug: slugified,
      shortDescription: values.shortDescription,
      country: values.country,
      director: values.director,
      actors: values.actors,
      metaTitle: values.metaTitle,
      metaDescription: values.metaDescription,
      keywords: values.keywords,
      canonicalUrl: values.canonicalUrl
    };

    const actualMovieId = selectedMovie?.id || savedMovie?.id || 'temp';
    const movieKey = `movie_meta_${actualMovieId}`;
    localStorage.setItem(movieKey, JSON.stringify(metaData));
  };

  // Tag inputs helper
  const handleAddActor = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = actorInput.trim();
      if (val && !watchActors.includes(val)) {
        setValue('actors', [...watchActors, val], { shouldDirty: true });
        setActorInput('');
      }
    }
  };

  const handleRemoveActor = (index: number) => {
    const nextActors = [...watchActors];
    nextActors.splice(index, 1);
    setValue('actors', nextActors, { shouldDirty: true });
  };

  // Youtube trailer parser
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

  const embedUrl = getYoutubeEmbedUrl(watchTrailerUrl);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseAttempt}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Right side Drawer CMS */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-2xl bg-[#0b0b0e] border-l border-white/10 shadow-2xl flex flex-col h-full text-left select-none z-10"
          >
            {/* Close trigger button */}
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="absolute top-5 right-5 bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-full transition-colors cursor-pointer z-20"
            >
              <X size={15} />
            </button>

            {/* Header titles */}
            <div className="p-6 md:p-8 border-b border-white/5 shrink-0 bg-[#0e0e12]/60">
              <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Film size={12} /> Portal CMS Admin
              </span>
              <h2 className="text-base md:text-lg font-black text-white uppercase tracking-wider">
                {selectedMovie ? 'Biên Tập Suất Chiếu Phim' : 'Thêm Mới Phim Điện Ảnh'}
              </h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                Thiết lập thông số phim điện ảnh, phương tiện và lịch chiếu rạp
              </p>
            </div>

            {/* Tab switch navigation */}
            <div className="flex gap-1 border-b border-white/5 px-6 md:px-8 py-2 shrink-0 bg-[#0c0c10]">
              {[
                { id: 'info', label: 'Thông tin chính' },
                { id: 'media', label: 'Phương tiện' },
                { id: 'specs', label: 'Thông số phim' },
                { id: 'showtimes', label: 'Lịch Chiếu Rạp' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-brand-gold/15 border border-brand-gold/20 text-brand-gold shadow-[0_0_15px_rgba(229,169,59,0.06)]' 
                      : 'text-gray-400 hover:text-white bg-transparent border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                
                {/* Tab 1: General Info */}
                {activeTab === 'info' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        type="text"
                        label="Tên Phim"
                        error={errors.title?.message?.toString()}
                        {...register('title')}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Mô Tả Phim</span>
                      <textarea
                        rows={4}
                        {...register('shortDescription')}
                        placeholder="Mô tả tóm tắt nội dung phim..."
                        className="w-full p-4 bg-[#121216] border border-white/5 focus:border-brand rounded-2xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors font-medium leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-wider">Trạng Thái Phát Hành</span>
                        <select
                          {...register('status')}
                          className="w-full px-3 py-3 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand transition-colors font-semibold"
                        >
                          <option value="NowShowing" className="bg-[#121217]">Đang Chiếu (Now Showing)</option>
                          <option value="ComingSoon" className="bg-[#121217]">Sắp Chiếu (Coming Soon)</option>
                          <option value="Ended" className="bg-[#121217]">Đã Kết Thúc (Ended)</option>
                          <option value="Hidden" className="bg-[#121217]">Đang Ẩn (Hidden)</option>
                        </select>
                      </div>

                      {/* Featured Toggle Switch */}
                      <div className="flex items-center gap-3 bg-[#121216] border border-white/5 px-4 py-3 rounded-xl">
                        <Controller
                          name="isFeatured"
                          control={control}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none shrink-0 cursor-pointer ${
                                field.value ? 'bg-brand-gold' : 'bg-gray-700'
                              }`}
                            >
                              <div
                                className={`bg-black w-4 h-4 rounded-full shadow-md transform duration-300 ${
                                  field.value ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white font-black uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={11} className="text-brand-gold animate-pulse" /> Phim Nổi Bật
                          </span>
                          <span className="text-[8px] text-gray-500 font-bold">Đặt ở slider banner chính trang chủ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Media & Trailer */}
                {activeTab === 'media' && (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col md:flex-row gap-6">
                      <Controller
                        name="posterUrl"
                        control={control}
                        render={({ field }) => (
                          <MovieUpload
                            label="Hình Ảnh Poster (Ảnh dọc tỷ lệ 2:3)"
                            value={field.value}
                            onChange={field.onChange}
                            onFileSelect={(file) => setPosterFile(file)}
                            aspectRatio="poster"
                            onPreview={() => setShowDetailPreview(true)}
                          />
                        )}
                      />

                      <Controller
                        name="bannerUrl"
                        control={control}
                        render={({ field }) => (
                          <MovieUpload
                            label="Ảnh Bìa / Backdrop (Ảnh ngang tỷ lệ 16:9)"
                            value={field.value}
                            onChange={field.onChange}
                            onFileSelect={(file) => setBannerFile(file)}
                            aspectRatio="backdrop"
                            onPreview={() => setShowDetailPreview(true)}
                          />
                        )}
                      />
                    </div>

                    <Input
                      type="text"
                      label="Đường dẫn YouTube Trailer"
                      placeholder="https://www.youtube.com/watch?v=..."
                      error={errors.trailerUrl?.message?.toString()}
                      {...register('trailerUrl')}
                    />

                    {embedUrl && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Play size={12} className="text-brand fill-brand" /> Xem trước trailer youtube
                        </span>
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                          <iframe
                            src={embedUrl}
                            title="Trailer Preview"
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Specs & SEO */}
                {activeTab === 'specs' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-wider">Thể Loại Phim</span>
                        <select
                          {...register('genreId')}
                          className="w-full px-3 py-3 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand transition-colors font-semibold"
                        >
                          {genres.map(g => (
                            <option key={g.genreId} value={g.genreId} className="bg-[#121216]">
                              {g.genreName || g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-wider">Phân Loại Độ Tuổi</span>
                        <select
                          {...register('ageRatingId')}
                          className="w-full px-3 py-3 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand transition-colors font-semibold"
                        >
                          {dbAgeRatings.map((r: any) => (
                            <option key={r.ageRatingId} value={r.ageRatingId} className="bg-[#121216]">
                              {r.ratingCode} - {r.description || ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        type="number"
                        label="Thời Lượng (phút)"
                        error={errors.duration?.message?.toString()}
                        {...register('duration')}
                      />
                      <div className="flex flex-col gap-1.5 text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-wider font-semibold">Ngôn Ngữ</span>
                        <select
                          {...register('language')}
                          className="w-full px-3 py-3 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand transition-colors font-semibold"
                        >
                          {dbLanguages.map((l: any) => (
                            <option key={l.languageId} value={l.languageName} className="bg-[#121216]">
                              {l.languageName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        type="text"
                        label="Quốc Gia"
                        error={errors.country?.message?.toString()}
                        {...register('country')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="date"
                        label="Ngày Khởi Chiếu"
                        error={errors.releaseDate?.message?.toString()}
                        {...register('releaseDate')}
                      />
                      <Input
                        type="date"
                        label="Ngày Kết Thúc"
                        error={errors.endDate?.message?.toString()}
                        {...register('endDate')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="text"
                        label="Đạo Diễn"
                        error={errors.director?.message?.toString()}
                        {...register('director')}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        label="Điểm IMDb"
                        error={errors.rating?.message?.toString()}
                        {...register('rating')}
                      />
                    </div>

                    {/* Actors Tag Input */}
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Danh Sách Diễn Viên</span>
                      <input
                        type="text"
                        placeholder="Nhập tên diễn viên rồi nhấn Enter..."
                        value={actorInput}
                        onChange={(e) => setActorInput(e.target.value)}
                        onKeyDown={handleAddActor}
                        className="w-full px-3 py-3 bg-[#121216] border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 focus:outline-none transition-colors font-semibold"
                      />
                      {watchActors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          {watchActors.map((actor: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-1 bg-white/5 border border-white/5 hover:border-brand/35 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                              onClick={() => handleRemoveActor(idx)}
                            >
                              {actor} <X size={10} className="text-gray-400" />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 4: Showtimes Calendar scheduler */}
                {activeTab === 'showtimes' && (
                  <div className="flex flex-col gap-6">
                    {selectedMovie ? (
                      <>
                        {/* Quick Add Showtime */}
                        <div className="bg-[#121216]/60 border border-white/5 p-4 rounded-2xl flex flex-col gap-4">
                          <h4 className="text-[10px] text-white font-black uppercase tracking-wider flex items-center gap-1.5">
                            <Plus size={12} className="text-brand-gold" /> Thêm nhanh suất chiếu cho phim
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Cinema Select */}
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="text-gray-400 font-bold uppercase tracking-wider">Chọn Rạp Chiếu</span>
                              <select
                                value={selectedCinemaId}
                                onChange={(e) => handleCinemaSelect(parseInt(e.target.value) || '')}
                                className="w-full px-3 py-2.5 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                              >
                                <option value="" className="bg-[#121217]">-- Chọn rạp --</option>
                                {cinemas.map(c => (
                                  <option key={c.cinemaId} value={c.cinemaId} className="bg-[#121217]">{c.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Hall Select */}
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                                <span>Chọn Phòng</span>
                                {loadingHalls && <Loader2 size={10} className="animate-spin text-brand" />}
                              </span>
                              <select
                                value={selectedHallId}
                                onChange={(e) => setSelectedHallId(e.target.value ? parseInt(e.target.value) : '')}
                                disabled={!selectedCinemaId || halls.length === 0}
                                className="w-full px-3 py-2.5 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand disabled:opacity-50 font-semibold"
                              >
                                {halls.length === 0 ? (
                                  <option value="">-- Chọn rạp trước --</option>
                                ) : (
                                  halls.map(h => (
                                    <option key={h.hallId} value={h.hallId} className="bg-[#121216]">
                                      {h.name} ({h.hallTypeName})
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              type="datetime-local"
                              label="Thời Gian Chiếu"
                              value={showtimeStartTime}
                              onChange={(e) => setShowtimeStartTime(e.target.value)}
                            />

                            <div className="flex flex-col gap-1 text-xs">
                              <span className="text-gray-400 font-bold uppercase tracking-wider">Mức Giá Vé</span>
                              <select
                                value={showtimePriceId}
                                onChange={(e) => setShowtimePriceId(parseInt(e.target.value))}
                                className="w-full px-3 py-2.5 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                              >
                                {dbPrices.map(p => (
                                  <option key={p.priceId} value={p.priceId} className="bg-[#121216]">
                                    {formatTicketType(p.ticketType)} - {p.value.toLocaleString()} đ
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={handleCreateShowtime}
                            disabled={savingShowtime || !selectedHallId || !showtimeStartTime}
                            variant="primary"
                            className="shadow-brand font-black uppercase text-[10px] py-2.5 mt-1"
                          >
                            {savingShowtime ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Xếp Lịch Chiếu'}
                          </Button>
                        </div>

                        {/* List of current showtimes */}
                        <div className="flex flex-col gap-2.5">
                          <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Danh sách lịch chiếu rạp ({showtimes.length})</span>
                          {loadingShowtimes ? (
                            <div className="flex items-center justify-center p-6 text-gray-500 gap-2">
                              <Loader2 size={16} className="animate-spin text-brand" />
                              <span className="text-xs font-bold uppercase">Đang tải lịch chiếu...</span>
                            </div>
                          ) : showtimes.length === 0 ? (
                            <div className="p-8 border border-dashed border-white/5 rounded-2xl text-center text-xs text-gray-500 font-bold uppercase">
                              Chưa có lịch chiếu nào được tạo cho phim này
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                              {showtimes.map((st) => (
                                <div key={st.showtimeId} className="bg-[#121216] border border-white/5 px-4 py-3 rounded-2xl flex justify-between items-center text-xs gap-3">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-white uppercase">{st.cinemaName || 'Hệ Thống Rạp'}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">
                                      {st.hallName || st.hall?.name || `Phòng ${st.hallId}`} • {new Date(st.startTime).toLocaleString('vi-VN')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-brand-gold font-bold">
                                      {(st.priceValue ?? 80000).toLocaleString('vi-VN')}đ
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteShowtime(st.showtimeId)}
                                      className="text-rose-500 hover:text-rose-400 p-2 bg-white/5 rounded-xl border border-white/5 hover:border-rose-500/20 transition-all cursor-pointer"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="p-12 border border-dashed border-white/5 rounded-3xl text-center flex flex-col gap-3 items-center justify-center">
                        <AlertTriangle size={32} className="text-brand-gold" />
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Chưa thể xếp lịch chiếu</h4>
                          <p className="text-[10px] text-gray-500 mt-1 font-semibold max-w-xs leading-relaxed">
                            Bạn vui lòng lưu thông tin chi tiết phim trước khi tiến hành xếp lịch chiếu rạp.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Save/Close Actions footer */}
                {activeTab !== 'showtimes' && (
                  <div className="flex gap-4 border-t border-white/5 pt-6 mt-4">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      fullWidth 
                      onClick={handleCloseAttempt}
                      disabled={saving}
                      className="py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider"
                    >
                      Hủy bỏ
                    </Button>
                    
                    <Button 
                      type="submit" 
                      variant="primary" 
                      fullWidth 
                      disabled={saving}
                      className="shadow-brand font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-wider"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu Thông Tin'}
                    </Button>
                  </div>
                )}

              </form>
            </div>

          </motion.div>

          {/* Unsaved Changes Discard Warning Overlay */}
          <AnimatePresence>
            {showDiscardWarning && (
              <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-[#121217] border border-white/10 rounded-3xl p-6 w-full max-w-xs text-center flex flex-col gap-4 items-center shadow-2xl"
                >
                  <div className="h-10 w-10 bg-brand/10 border border-brand/20 text-brand rounded-full flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Hủy bỏ thay đổi?</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-semibold leading-relaxed">
                      Bạn có thay đổi chưa lưu trên form. Rời đi sẽ làm mất hoàn toàn dữ liệu đã nhập.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full mt-2">
                    <button
                      type="button"
                      onClick={() => setShowDiscardWarning(false)}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-[10px] font-black uppercase py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Tiếp Tục
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiscardWarning(false);
                        onClose();
                      }}
                      className="flex-1 bg-brand hover:bg-brand-hover text-white text-[10px] font-black uppercase py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-brand/10"
                    >
                      Bỏ Qua
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Detail Preview Modal (Doraemon style) */}
          <AnimatePresence>
            {showDetailPreview && (
              <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
                {/* Backdrop glass */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDetailPreview(false)}
                  className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
                />

                {/* Modal Body */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative w-full max-w-3xl bg-[#0d0d11] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row gap-6 p-6 md:p-8 z-10 text-left text-gray-200"
                >
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setShowDetailPreview(false)}
                    className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full cursor-pointer transition-colors"
                  >
                    <X size={14} />
                  </button>

                  {/* Poster Column */}
                  <div className="w-full md:w-1/3 shrink-0 flex flex-col gap-3">
                    <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-[#121217]">
                      {watch('posterUrl') ? (
                        <img src={watch('posterUrl')} alt="Poster" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-white/[0.01]">
                          <Film size={36} />
                          <span className="text-[10px] font-bold mt-2">CHƯA CÓ POSTER</span>
                        </div>
                      )}
                    </div>
                    {/* Age rating badge if available */}
                    <div className="flex justify-center">
                      <span className="bg-brand/10 border border-brand/25 text-brand text-[10px] font-black uppercase px-3 py-1 rounded-xl">
                        Mác độ tuổi: {['P', 'K', 'T13', 'T16', 'T18', 'C18'][(watch('ageRatingId') ?? 1) - 1] || 'P'}
                      </span>
                    </div>
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 flex flex-col gap-4">
                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
                      <Film className="text-brand-gold" size={20} /> {watch('title') || 'Tên Phim Chưa Nhập'}
                    </h3>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Tóm tắt nội dung</span>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium bg-white/[0.01] border border-white/5 p-4 rounded-2xl italic">
                        {watch('shortDescription') || 'Chưa có mô tả cốt truyện của phim.'}
                      </p>
                    </div>

                    {/* Metadata list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Đạo diễn</span>
                        <span className="text-gray-200 font-semibold">{watch('director') || 'Chưa cập nhật'}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Diễn viên chính</span>
                        <span className="text-gray-200 font-semibold">
                          {watch('actors')?.length > 0 ? watch('actors').join(', ') : 'Chưa cập nhật'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Thể loại</span>
                        <span className="text-gray-200 font-semibold">
                          {genres.find(g => g.genreId === Number(watch('genreId')))?.genreName || genres.find(g => g.genreId === Number(watch('genreId')))?.name || 'Chưa chọn'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Thời lượng</span>
                        <span className="text-gray-200 font-semibold">{watch('duration') ? `${watch('duration')} phút` : 'Chưa cập nhật'}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Ngôn ngữ</span>
                        <span className="text-gray-200 font-semibold">{watch('language') || 'Chưa cập nhật'}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Ngày khởi chiếu</span>
                        <span className="text-gray-200 font-semibold">
                          {watch('releaseDate') ? new Date(watch('releaseDate')).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}
    </AnimatePresence>
  );
};

export default MovieModal;
