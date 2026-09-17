import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient, getImageUrl } from '../../api/client';
import { selectShowtime } from '../../store/bookingSlice';
import type { Movie, Review, ReviewReply, Showtime, Cinema } from '../../types';
import { getAgeRatingCode, getAgeRatingColorClass } from '../../utils/ageRatingHelpers';
import { Button } from '../../components/ui/Button';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { MovieCard } from '../../components/movie/MovieCard';
import { Star, Play, Send, ThumbsUp, ThumbsDown, MessageSquare, Trash2, X, Sparkles, Info, Heart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const parseApiDate = (dateOrString: Date | string) => {
  if (dateOrString instanceof Date) return dateOrString;
  if (typeof dateOrString === 'string') {
    if (dateOrString.includes('T') && !dateOrString.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateOrString)) {
      return new Date(`${dateOrString}Z`);
    }
  }
  return new Date(dateOrString);
};

const getFallbackDetails = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('spider-man') || lower.includes('spiderman')) {
    return {
      director: 'Jon Watts',
      actors: ['Tom Holland', 'Zendaya', 'Benedict Cumberbatch', 'Jacob Batalon']
    };
  }
  if (lower.includes('doctor strange') || lower.includes('dr. strange')) {
    return {
      director: 'Sam Raimi',
      actors: ['Benedict Cumberbatch', 'Elizabeth Olsen', 'Chiwetel Ejiofor', 'Benedict Wong']
    };
  }
  if (lower.includes('top gun') || lower.includes('topgun')) {
    return {
      director: 'Joseph Kosinski',
      actors: ['Tom Cruise', 'Miles Teller', 'Jennifer Connelly', 'Jon Hamm']
    };
  }
  if (lower.includes('batman')) {
    return {
      director: 'Matt Reeves',
      actors: ['Robert Pattinson', 'Zoë Kravitz', 'Paul Dano', 'Jeffrey Wright']
    };
  }
  return null;
};

export const MovieDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);

  // Review inputs
  const [ratingScore, setRatingScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // States for replies
  const [expandedReplies, setExpandedReplies] = useState<{ [reviewId: number]: boolean }>({});
  const [replyContent, setReplyContent] = useState<{ [reviewId: number]: string }>({});
  const [activeParentReply, setActiveParentReply] = useState<{ [reviewId: number]: ReviewReply | null }>({});
  const [expandedChildReplies, setExpandedChildReplies] = useState<{ [directReplyId: number]: boolean }>({});

  // States for interactive actions
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [loadingMovie, setLoadingMovie] = useState(true);

  const [localMeta, setLocalMeta] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = () => {
      if (movie) {
        try {
          const storedFavs = localStorage.getItem('favoriteMovies');
          if (storedFavs) {
            const favs = JSON.parse(storedFavs);
            if (Array.isArray(favs)) {
              setIsFavorite(favs.some((m: any) => m.id === movie.id));
            }
          }
        } catch (err) {
          console.error("Error loading favorite status", err);
        }
      }
    };

    checkFavoriteStatus();
    window.addEventListener('local-storage-favorites-updated', checkFavoriteStatus);
    return () => window.removeEventListener('local-storage-favorites-updated', checkFavoriteStatus);
  }, [movie]);

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để lưu phim yêu thích.', 'warning');
      return;
    }
    if (!movie) return;
    try {
      const storedFavsStr = localStorage.getItem('favoriteMovies');
      let favs = storedFavsStr ? JSON.parse(storedFavsStr) : [];
      if (!Array.isArray(favs)) favs = [];

      if (isFavorite) {
        favs = favs.filter((m: any) => m.id !== movie.id);
        setIsFavorite(false);
        showToast('Đã xóa khỏi danh sách yêu thích.', 'success');
      } else {
        const favoriteMovieItem = {
          id: movie.id,
          title: movie.title,
          slug: movie.slug,
          posterUrl: movie.posterUrl,
          genre: {
            name: movie.genreName || movie.genre?.genreName || movie.genre?.name || 'Chưa rõ'
          }
        };
        favs.push(favoriteMovieItem);
        setIsFavorite(true);
        showToast('Đã thêm vào danh sách yêu thích!', 'success');
      }
      localStorage.setItem('favoriteMovies', JSON.stringify(favs));
      window.dispatchEvent(new Event('local-storage-favorites-updated'));
    } catch (err) {
      console.error("Error toggling favorite", err);
      showToast('Không thể cập nhật danh sách yêu thích.', 'error');
    }
  };

  // States for showtimes
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // 1. Fetch movie details and subcomponents
  useEffect(() => {
    const fetchMovieData = async () => {
      setLoadingMovie(true);
      try {
        const movieRes = await apiClient.get<any>(`/movies/slug/${slug}`);
        const responseData = movieRes.data;
        const movieData = responseData?.data ?? responseData;
        setMovie(movieData);

        if (movieData) {
          // Load local meta
          const metaStr = localStorage.getItem(`movie_meta_${movieData.id}`);
          if (metaStr) {
            try {
              setLocalMeta(JSON.parse(metaStr));
            } catch (e) {
              console.error(e);
            }
          } else {
            setLocalMeta(null);
          }
          // Fetch reviews
          fetchReviews(movieData.id);
          // Fetch showtimes
          fetchShowtimes(movieData.id);
          // Fetch similar movies of the same genre
          fetchSimilar(movieData.genreId, movieData.id);
        }
      } catch (err) {
        showToast('Không thể tải thông tin chi tiết phim.', 'error');
        navigate('/');
      } finally {
        setLoadingMovie(false);
      }
    };
    fetchMovieData();
  }, [slug]);

  // Handle sticky booking bar trigger on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch showtimes
  const fetchShowtimes = async (movieId: number) => {
    setLoadingShowtimes(true);
    try {
      const res = await apiClient.get(`/showtimes/movie/${movieId}`);
      const data = res.data?.data ?? res.data;
      const items: Showtime[] = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items : [];
      setShowtimes(items);
      const uniqueCinemaIds = Array.from(new Set(items.map((s: Showtime) => s.hall?.cinemaId).filter(Boolean))) as number[];
      if (uniqueCinemaIds.length > 0) {
        const cinemaResponses = await Promise.all(uniqueCinemaIds.map(id => apiClient.get<any>(`/cinemas/${id}`)));
        setCinemas(cinemaResponses.map(r => {
          const d = r.data?.data ?? r.data;
          return {
            cinemaId: d.cinemaId,
            name: d.cinemaName || d.name || '',
            address: d.address,
            city: d.cityName || '',
            imageUrl: d.imageUrl
          };
        }));
      }
    } catch (err) {
      console.error("Error fetching showtimes", err);
    } finally {
      setLoadingShowtimes(false);
    }
  };

  // Fetch reviews
  const fetchReviews = async (movieId: number) => {
    try {
      const reviewsRes = await apiClient.get<any>(`/reviews/movie/${movieId}`);
      const data = reviewsRes.data?.data ?? reviewsRes.data;
      const items = data?.items ?? (Array.isArray(data) ? data : []);
      setReviews(items);
    } catch (err) {
      console.error("Error loading reviews", err);
    }
  };

  const fetchSimilar = async (genreId: number, currentMovieId: number) => {
    try {
      const similarRes = await apiClient.get<any>('/movies', {
        params: { GenreId: genreId, PageSize: 5 }
      });
      const data = similarRes.data?.data ?? similarRes.data;
      const items = data?.items ?? (Array.isArray(data) ? data : []);
      const filtered = items.filter((m: any) => m.id !== currentMovieId);
      setSimilarMovies(filtered);
    } catch (err) {
      console.error("Error loading similar movies", err);
    }
  };
  const availableDates = Array.from(
    new Set(
      showtimes
        .filter(s => parseApiDate(s.startTime).getTime() > Date.now())
        .map(s => parseApiDate(s.startTime).toDateString())
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  useEffect(() => {
    if (availableDates.length > 0) {
      if (!selectedDate || !availableDates.includes(selectedDate)) {
        setSelectedDate(availableDates[0]);
      }
    } else {
      setSelectedDate('');
    }
  }, [availableDates.length, selectedDate]);

  const filteredShowtimes = showtimes.filter(s => {
    const matchesCinema = selectedCinemaId ? s.hall?.cinemaId === selectedCinemaId : true;
    const matchesDate = selectedDate ? parseApiDate(s.startTime).toDateString() === selectedDate : true;
    const isFuture = parseApiDate(s.startTime).getTime() > Date.now();
    return matchesCinema && matchesDate && isFuture;
  });

  const groupedShowtimes = cinemas
    .filter(c => selectedCinemaId === null || c.cinemaId === selectedCinemaId)
    .map(cinema => {
      const cinemaShowtimes = filteredShowtimes.filter(s => s.hall?.cinemaId === cinema.cinemaId);
      const byFormat: Record<string, Showtime[]> = {};
      cinemaShowtimes.forEach(st => {
        const formatName = st.hall?.hallTypeName || '2D';
        if (!byFormat[formatName]) {
          byFormat[formatName] = [];
        }
        byFormat[formatName].push(st);
      });
      return { cinema, byFormat, total: cinemaShowtimes.length };
    })
    .filter(g => g.total > 0);

  const handleSelectShowtime = (st: Showtime) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để đặt vé', 'warning');
      navigate('/login', { state: { from: `/movie/${slug}` } });
      return;
    }
    dispatch(selectShowtime({ ...st, movie: movie || undefined }));
    navigate('/booking');
  };

  const formatVietnameseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdayNum = d.getDay();
    const weekdayStr = weekdayNum === 0 ? 'Chủ Nhật' : `Thứ ${weekdayNum + 1}`;
    return `${weekdayStr}, ${d.getDate()} thg ${d.getMonth() + 1}`;
  };


  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để viết đánh giá.', 'warning');
      return;
    }

    try {
      await apiClient.post('/reviews', {
        movieId: movie?.id,
        rating: ratingScore,
        comment: reviewComment,
      });

      showToast('Đã gửi đánh giá thành công!', 'success');
      setReviewComment('');
      if (movie) {
        fetchReviews(movie.id);
        // Refresh movie details to update rating breakdown
        const res = await apiClient.get<any>(`/movies/slug/${slug}`);
        const responseData = res.data;
        const movieData = responseData?.data ?? responseData;
        if (movieData) setMovie(movieData);
      }
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Không thể gửi đánh giá. Có thể bạn đã đánh giá phim này rồi.';
      showToast(msg, 'error');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;

    try {
      await apiClient.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.reviewId !== reviewId));
      showToast('Đã xóa đánh giá thành công!', 'success');
      if (movie && slug) {
        const res = await apiClient.get<any>(`/movies/slug/${slug}`);
        const responseData = res.data;
        const movieData = responseData?.data ?? responseData;
        if (movieData) setMovie(movieData);
      }
    } catch (err) {
      console.error("Error deleting review", err);
      showToast('Không thể xóa đánh giá.', 'error');
    }
  };

  const handleLikeReview = async (id: number) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thích đánh giá.', 'warning');
      return;
    }

    try {
      const res = await apiClient.post<any>(`/reviews/${id}/like`);
      const updatedReview = res.data?.data ?? res.data;
      if (updatedReview) {
        const currentReview = reviews.find(r => r.reviewId === id);
        if (currentReview) {
          const wasLiked = updatedReview.likesCount > currentReview.likesCount;
          showToast(wasLiked ? 'Đã thích đánh giá!' : 'Đã bỏ thích đánh giá!', 'success');
        }
        setReviews(prev => prev.map(r => r.reviewId === id ? { ...r, likesCount: updatedReview.likesCount, dislikesCount: updatedReview.dislikesCount } : r));
      }
    } catch (err) {
      console.error("Error liking review", err);
    }
  };

  const handleDislikeReview = async (id: number) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để không thích đánh giá.', 'warning');
      return;
    }

    try {
      const res = await apiClient.post<any>(`/reviews/${id}/dislike`);
      const updatedReview = res.data?.data ?? res.data;
      if (updatedReview) {
        const currentReview = reviews.find(r => r.reviewId === id);
        if (currentReview) {
          const wasDisliked = updatedReview.dislikesCount > currentReview.dislikesCount;
          showToast(wasDisliked ? 'Đã không thích đánh giá!' : 'Đã bỏ không thích đánh giá!', 'success');
        }
        setReviews(prev => prev.map(r => r.reviewId === id ? { ...r, likesCount: updatedReview.likesCount, dislikesCount: updatedReview.dislikesCount } : r));
      }
    } catch (err) {
      console.error("Error disliking review", err);
    }
  };

  const handlePostReply = async (reviewId: number) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để phản hồi đánh giá.', 'warning');
      return;
    }

    const content = replyContent[reviewId]?.trim();
    if (!content) return;

    const parentReply = activeParentReply[reviewId];

    try {
      const res = await apiClient.post<any>(`/reviews/${reviewId}/replies`, {
        content,
        parentReplyId: parentReply?.reviewReplyId
      });
      const newReply = res.data?.data ?? res.data;
      setReviews(prev => prev.map(r => {
        if (r.reviewId === reviewId) {
          return { ...r, replies: [...(r.replies || []), newReply] };
        }
        return r;
      }));
      setReplyContent(prev => ({ ...prev, [reviewId]: '' }));
      setActiveParentReply(prev => ({ ...prev, [reviewId]: null }));
      showToast('Đã gửi phản hồi thành công!', 'success');
    } catch (err) {
      console.error("Error posting reply", err);
      showToast('Không thể gửi phản hồi.', 'error');
    }
  };

  const handleDeleteReply = async (replyId: number, reviewId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return;

    try {
      await apiClient.delete(`/reviews/replies/${replyId}`);
      setReviews(prev => prev.map(r => {
        if (r.reviewId === reviewId) {
          return { ...r, replies: (r.replies || []).filter(rp => rp.reviewReplyId !== replyId) };
        }
        return r;
      }));
      showToast('Đã xóa phản hồi thành công!', 'success');
    } catch (err) {
      console.error("Error deleting reply", err);
      showToast('Không thể xóa phản hồi.', 'error');
    }
  };

  const toggleReplies = (reviewId: number) => {
    setExpandedReplies(prev => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const getRootParentId = (replyId: number, replies: ReviewReply[]): number => {
    let current: ReviewReply | undefined = replies.find(rp => rp.reviewReplyId === replyId);
    while (current && current.parentReplyId) {
      const parentId: number = current.parentReplyId;
      const parent: ReviewReply | undefined = replies.find(rp => rp.reviewReplyId === parentId);
      if (!parent) break;
      current = parent;
    }
    return current ? current.reviewReplyId : replyId;
  };

  const getChildRepliesFor = (directReplyId: number, replies: ReviewReply[]) => {
    return (replies || []).filter(rp => {
      if (!rp.parentReplyId) return false;
      return getRootParentId(rp.reviewReplyId, replies) === directReplyId;
    });
  };



  // Convert watch URL into embedded URL for popup player
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('/').pop()?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  if (loadingMovie) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-6 text-left">
        <SkeletonLoader className="h-96 w-full rounded-2xl animate-pulse" />
        <SkeletonLoader className="h-6 w-1/3 rounded" variant="text" />
        <SkeletonLoader className="h-4 w-3/4 rounded" variant="text" />
      </div>
    );
  }

  if (!movie) return null;

  const fallback = getFallbackDetails(movie.title);
  const directorDisplay = movie.directorName || localMeta?.director || fallback?.director || movie.director?.name || 'Chưa rõ';
  const actorsDisplay = (localMeta?.actors && localMeta.actors.length > 0)
    ? localMeta.actors.join(', ')
    : (movie.actors && movie.actors.length > 0)
      ? movie.actors.map((a) => a.actorName).join(', ')
      : (fallback?.actors && fallback.actors.length > 0)
        ? fallback.actors.join(', ')
        : (movie.movieActors && movie.movieActors.length > 0)
          ? movie.movieActors.map((ma) => ma.actor.name).join(', ')
          : 'Chưa rõ';

  return (
    <div className="flex flex-col min-h-screen pb-16 relative">

      {/* Fullscreen Backdrop Header */}
      <div className="relative h-[55vh] md:h-[65vh] w-full overflow-hidden select-none">
        <img
          src={getImageUrl(movie.bannerUrl) || getImageUrl(movie.posterUrl) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200'}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover filter brightness-50"
        />

        {/* Deep ambient dark gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent hidden md:block" />

        {/* Floating play trailer button */}
        {movie.trailerUrl && (
          <button
            onClick={() => setIsTrailerOpen(true)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-5 bg-brand text-white rounded-full hover:bg-brand-hover hover:scale-110 active:scale-95 transition-all shadow-brand flex items-center justify-center cursor-pointer group"
          >
            <Play size={26} fill="white" className="group-hover:animate-pulse" />
          </button>
        )}
      </div>

      {/* Main Info layout */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 mt-[-140px] md:mt-[-180px] relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-left">

        {/* Left Column: Floating Poster */}
        <div className="md:col-span-1 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl aspect-[2/3] border border-white/10 shadow-glass w-full"
          >
            <img
              src={getImageUrl(movie.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400'}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
            {/* Age Rating Badge */}
            {movie.ageRatingId && (
              <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-lg border z-10 ${getAgeRatingColorClass(movie.ageRatingId)}`}>
                {getAgeRatingCode(movie.ageRatingId)}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Title Info, Description, and Details Grid (Beta Cinemas style) */}
        <div className="md:col-span-3 flex flex-col gap-6 pt-6 md:pt-16">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-2">
              {movie.title}
            </h1>

            <div className="flex items-center gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/20 px-3 py-1.5 rounded-xl">
                <Star size={16} fill="#e5a93b" className="text-brand-gold" />
                <span className="text-sm font-extrabold text-white">
                  {movie.averageRating ? movie.averageRating.toFixed(1) : (movie.rating ? movie.rating.toFixed(1) : '0.0')}
                </span>
                <span className="text-[11px] text-gray-400">/ 5</span>
              </div>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                {movie.reviewCount || 0} đánh giá
              </span>

              <button
                onClick={handleToggleFavorite}
                className={`ml-auto md:ml-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  isFavorite
                    ? 'bg-brand/10 border-brand text-brand shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <Heart size={14} fill={isFavorite ? '#ef4444' : 'none'} className={isFavorite ? 'text-brand' : 'text-gray-400'} />
                {isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
              </button>
            </div>

            {/* Description paragraph directly under title */}
            <p className="text-sm text-gray-300 leading-relaxed max-w-4xl font-medium mb-6">
              {movie.description || 'Không có tóm tắt chi tiết cho bộ phim này.'}
            </p>

            {/* Details Grid Table */}
            <div className="flex flex-col gap-4 text-sm border-t border-white/5 pt-6">
              <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3.5 text-xs md:text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px]">Đạo diễn:</span>
                <span className="text-gray-200 font-semibold">{directorDisplay}</span>

                <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px]">Diễn viên:</span>
                <span className="text-gray-200 font-semibold">
                  {actorsDisplay}
                </span>

                <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px]">Thể loại:</span>
                <span className="text-gray-200 font-semibold">
                  {movie.genreName || movie.genre?.genreName || movie.genre?.name || 'Chưa rõ'}
                </span>

                <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px]">Thời lượng:</span>
                <span className="text-gray-200 font-semibold">{movie.duration} phút</span>

                <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px]">Ngôn ngữ:</span>
                <span className="text-gray-200 font-semibold capitalize">{movie.language || 'Chưa rõ'}</span>

                <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px]">Ngày khởi chiếu:</span>
                <span className="text-gray-200 font-semibold">
                  {movie.releaseDate
                    ? new Date(movie.releaseDate).toLocaleDateString('vi-VN')
                    : 'Chưa rõ'}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Showtimes Selection Section */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 mt-16 text-left">
        <h2 className="text-xl font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-3 mb-6">
          Lịch Chiếu & Đặt Vé
        </h2>

        {loadingShowtimes ? (
          <div className="flex flex-col gap-4">
            <SkeletonLoader className="h-16 w-full rounded-xl" />
            <SkeletonLoader className="h-32 w-full rounded-xl" />
          </div>
        ) : showtimes.length === 0 ? (
          <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-10 text-center flex flex-col items-center gap-2">
            <Info className="text-gray-600" size={28} />
            <p className="text-xs font-bold text-gray-400">Hiện tại phim chưa có lịch chiếu</p>
            <p className="text-[10px] text-gray-500">Vui lòng quay lại sau hoặc chọn phim khác.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Filters */}
            <div className="flex flex-col gap-5 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
              {/* Select Cinema */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Chọn Rạp Chiếu
                </span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCinemaId(null)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      selectedCinemaId === null
                        ? 'bg-brand border-brand text-white shadow-brand'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Tất Cả Rạp
                  </button>
                  {cinemas.map(c => (
                    <button
                      key={c.cinemaId}
                      onClick={() => setSelectedCinemaId(c.cinemaId)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedCinemaId === c.cinemaId
                          ? 'bg-brand border-brand text-white shadow-brand'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Date */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Chọn Ngày Chiếu
                </span>
                <div className="flex gap-2 flex-wrap">
                  {availableDates.map(d => (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedDate === d
                          ? 'bg-brand border-brand text-white shadow-brand'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {formatVietnameseDate(d)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Showtimes Grid */}
            {groupedShowtimes.length === 0 ? (
              <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-10 text-center flex flex-col items-center gap-2">
                <Info className="text-gray-600" size={28} />
                <p className="text-xs font-bold text-gray-400">Không có suất chiếu nào phù hợp</p>
                <p className="text-[10px] text-gray-500">Vui lòng chọn ngày chiếu hoặc rạp chiếu khác.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {groupedShowtimes.map(({ cinema, byFormat }) => (
                  <div key={cinema.cinemaId} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-5">
                    {/* Cinema Name & Address */}
                    <div className="border-b border-white/5 pb-3">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        {cinema.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">{cinema.address}</p>
                    </div>

                    {/* Formats under this Cinema */}
                    {Object.entries(byFormat).map(([formatName, sts]) => (
                      <div key={formatName} className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          {formatName}
                        </span>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                          {sts
                            .sort((a, b) => parseApiDate(a.startTime).getTime() - parseApiDate(b.startTime).getTime())
                            .map(st => {
                              const d = parseApiDate(st.startTime);
                              const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                              const late = d.getHours() >= 22;
                              const isSneak = movie.releaseDate ? parseApiDate(st.startTime) < parseApiDate(movie.releaseDate) : false;

                              return (
                                <button
                                  key={st.showtimeId}
                                  onClick={() => handleSelectShowtime(st)}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer relative overflow-hidden group select-none ${
                                    isSneak
                                      ? 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/60'
                                      : late
                                        ? 'border-brand/40 bg-brand/8 hover:bg-brand/15'
                                        : 'border-white/5 bg-white/[0.02] hover:border-brand/30 hover:bg-white/[0.04]'
                                  }`}
                                >
                                  {isSneak && (
                                    <span className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-[5px] font-black uppercase px-0.5 py-0.5 rounded-bl-md leading-none tracking-wider scale-90 origin-top-right">
                                      SỚM
                                    </span>
                                  )}
                                  <span className={`text-sm font-black transition-colors ${isSneak ? 'text-purple-400' : late ? 'text-brand' : 'text-white'}`}>
                                    {time}
                                  </span>
                                  <span className="text-[9px] text-gray-500 font-semibold mt-0.5">
                                    {st.availableSeats} ghế trống
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>



      {/* Review System Section */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 mt-16 text-left grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left Column: Post a Review */}
        <div className="md:col-span-1">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">Viết Đánh Giá</h3>
          {isAuthenticated ? (
            <form onSubmit={handlePostReview} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Điểm Đánh Giá của bạn</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setRatingScore(stars)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        size={20}
                        fill={stars <= ratingScore ? '#e5a93b' : 'none'}
                        className={stars <= ratingScore ? 'text-brand-gold' : 'text-gray-600'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Bình luận</span>
                  <span className={`text-[10px] font-bold ${reviewComment.length >= 10 && reviewComment.length <= 1000 ? 'text-green-500' : 'text-gray-500'}`}>
                    {reviewComment.length}/1000 kí tự (tối thiểu 10)
                  </span>
                </div>
                <textarea
                  placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim này (tối thiểu 10 kí tự)..."
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-3 bg-[#121216] border border-gray-800 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
                />
                {reviewComment.length > 0 && reviewComment.length < 10 && (
                  <span className="text-[10px] text-red-500 font-semibold">* Bình luận phải có ít nhất 10 kí tự.</span>
                )}
              </div>

              <Button type="submit" variant="primary" fullWidth className="flex items-center gap-2" disabled={reviewComment.length < 10 || reviewComment.length > 1000}>
                <Send size={14} /> Gửi Đánh Giá
              </Button>
            </form>
          ) : (
            <div className="p-6 glass-panel rounded-2xl text-center text-xs text-gray-500">
              Vui lòng{' '}
              <span onClick={() => navigate('/login')} className="text-brand hover:underline cursor-pointer font-bold">
                đăng nhập
              </span>{' '}
              để viết đánh giá.
            </div>
          )}
        </div>

        {/* Right Column: User Reviews */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">Đánh Giá & Phản Hồi</h3>

          {/* Rating Summary Breakdown Dashboard */}
          {movie.ratingSummary && movie.ratingSummary.totalReviews > 0 && (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row gap-8 items-center mb-6">
              <div className="flex flex-col items-center justify-center text-center px-4 md:border-r border-white/5 min-w-[120px]">
                <span className="text-5xl font-black text-white">
                  {movie.averageRating ? movie.averageRating.toFixed(1) : (movie.rating ? movie.rating.toFixed(1) : '0.0')}
                </span>
                <div className="flex gap-0.5 mt-2 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < Math.round(movie.averageRating || movie.rating) ? '#e5a93b' : 'none'}
                      className={i < Math.round(movie.averageRating || movie.rating) ? 'text-brand-gold' : 'text-gray-700'}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{movie.reviewCount || 0} Đánh giá</span>
              </div>

              <div className="flex-1 w-full flex flex-col gap-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count =
                    stars === 5 ? movie.ratingSummary!.fiveStarCount :
                      stars === 4 ? movie.ratingSummary!.fourStarCount :
                        stars === 3 ? movie.ratingSummary!.threeStarCount :
                          stars === 2 ? movie.ratingSummary!.twoStarCount :
                            movie.ratingSummary!.oneStarCount;
                  const percentage = movie.ratingSummary!.totalReviews > 0
                    ? Math.round((count / movie.ratingSummary!.totalReviews) * 100)
                    : 0;

                  return (
                    <div key={stars} className="flex items-center gap-3 text-[11px]">
                      <span className="w-8 font-bold text-gray-400 flex items-center gap-0.5">{stars} <Star size={10} fill="#e5a93b" className="text-brand-gold inline" /></span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-gold to-yellow-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-gray-500 font-bold">{percentage}% ({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {reviews.length === 0 ? (
              <span className="text-xs text-gray-500 py-8">Hãy là người đầu tiên đánh giá bộ phim này.</span>
            ) : (
              reviews.map((r) => (
                <div key={r.reviewId} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-gray-200">{r.userName}</span>
                        {r.isVerifiedViewer && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 font-black uppercase tracking-wider">
                            Đã xem phim
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            fill={i < r.rating ? '#e5a93b' : 'none'}
                            className={i < r.rating ? 'text-brand-gold' : 'text-gray-700'}
                          />
                        ))}
                      </div>
                      {(user?.userId === r.userId || isAdmin) && (
                        <button
                          onClick={() => handleDeleteReview(r.reviewId)}
                          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer p-1 rounded hover:bg-white/5"
                          title="Xóa đánh giá"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{r.comment || 'Không có bình luận.'}</p>

                  <div className="flex items-center gap-4 border-t border-white/5 pt-2 mt-1">
                    <button
                      onClick={() => handleLikeReview(r.reviewId)}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-brand transition-colors cursor-pointer"
                    >
                      <ThumbsUp size={12} />
                      <span>{r.likesCount} Thích</span>
                    </button>

                    <button
                      onClick={() => handleDislikeReview(r.reviewId)}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <ThumbsDown size={12} />
                      <span>{r.dislikesCount} Không thích</span>
                    </button>

                    <button
                      onClick={() => toggleReplies(r.reviewId)}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-brand transition-colors cursor-pointer ml-auto"
                    >
                      <MessageSquare size={12} />
                      <span>Phản hồi ({r.replies?.length || 0})</span>
                    </button>
                  </div>

                  {/* Replies Section */}
                  {expandedReplies[r.reviewId] && (
                    <div className="mt-2 pl-4 border-l-2 border-white/10 flex flex-col gap-2 transition-all">
                      {/* Replies List */}
                      {r.replies && r.replies.length > 0 ? (
                        <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                          {(r.replies.filter(rp => !rp.parentReplyId)).map((rp) => {
                            const children = getChildRepliesFor(rp.reviewReplyId, r.replies);
                            return (
                              <div key={rp.reviewReplyId} className="flex flex-col gap-1">
                                {/* Direct Reply Card */}
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-gray-300">{rp.userName}</span>
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-[9px] text-gray-500">
                                        {new Date(rp.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {isAuthenticated && (
                                        <button
                                          onClick={() => setActiveParentReply(prev => ({ ...prev, [r.reviewId]: rp }))}
                                          className="text-gray-400 hover:text-brand transition-colors cursor-pointer text-[10px] font-bold"
                                        >
                                          Trả lời
                                        </button>
                                      )}
                                      {(user?.userId === rp.userId || isAdmin) && (
                                        <button
                                          onClick={() => handleDeleteReply(rp.reviewReplyId, r.reviewId)}
                                          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-gray-300 font-sans leading-relaxed">{rp.content}</p>
                                </div>

                                {/* Collapsible Child Replies Dropdown */}
                                {children.length > 0 && (
                                  <div className="pl-4 flex flex-col gap-1">
                                    <button
                                      onClick={() => setExpandedChildReplies(prev => ({ ...prev, [rp.reviewReplyId]: !prev[rp.reviewReplyId] }))}
                                      className="text-[9px] text-brand hover:text-brand-light flex items-center gap-1 font-bold cursor-pointer w-max ml-1"
                                    >
                                      <span>—</span>
                                      <span>
                                        {expandedChildReplies[rp.reviewReplyId]
                                          ? 'Ẩn phản hồi'
                                          : `Xem ${children.length} phản hồi`}
                                      </span>
                                    </button>

                                    {expandedChildReplies[rp.reviewReplyId] && (
                                      <div className="flex flex-col gap-1.5 border-l border-white/10 pl-3 mt-0.5">
                                        {children.map((childRp) => (
                                          <div key={childRp.reviewReplyId} className="p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-extrabold text-gray-300">{childRp.userName}</span>
                                                <span className="text-[10px] text-gray-500">trả lời</span>
                                                <span className="font-black text-brand-gold">@{childRp.parentReplyUserName}</span>
                                              </div>
                                              <div className="flex items-center gap-2.5">
                                                <span className="text-[9px] text-gray-500">
                                                  {new Date(childRp.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isAuthenticated && (
                                                  <button
                                                    onClick={() => setActiveParentReply(prev => ({ ...prev, [r.reviewId]: childRp }))}
                                                    className="text-gray-400 hover:text-brand transition-colors cursor-pointer text-[10px] font-bold"
                                                  >
                                                    Trả lời
                                                  </button>
                                                )}
                                                {(user?.userId === childRp.userId || isAdmin) && (
                                                  <button
                                                    onClick={() => handleDeleteReply(childRp.reviewReplyId, r.reviewId)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                                                  >
                                                    <Trash2 size={10} />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                            <p className="text-gray-300 font-sans leading-relaxed">{childRp.content}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500 italic">Chưa có phản hồi nào.</span>
                      )}

                      {/* Reply Input Form */}
                      {isAuthenticated ? (
                        <div className="flex flex-col gap-1">
                          {activeParentReply[r.reviewId] && (
                            <div className="flex items-center justify-between bg-white/5 px-2 py-1 rounded-md text-[10px] text-brand-gold font-sans border border-white/5">
                              <span>Đang phản hồi @{activeParentReply[r.reviewId]?.userName}</span>
                              <button
                                onClick={() => setActiveParentReply(prev => ({ ...prev, [r.reviewId]: null }))}
                                className="text-gray-500 hover:text-white cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-2 py-1.5">
                            <input
                              type="text"
                              placeholder={activeParentReply[r.reviewId] ? `Trả lời @${activeParentReply[r.reviewId]?.userName}...` : "Viết phản hồi..."}
                              value={replyContent[r.reviewId] || ''}
                              onChange={(e) => setReplyContent(prev => ({ ...prev, [r.reviewId]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handlePostReply(r.reviewId);
                                }
                              }}
                              className="bg-transparent border-none outline-none text-[11px] text-white flex-1 font-sans placeholder-gray-500"
                            />
                            <button
                              onClick={() => handlePostReply(r.reviewId)}
                              disabled={!replyContent[r.reviewId]?.trim()}
                              className="text-brand hover:text-brand-light disabled:text-gray-600 transition-colors cursor-pointer"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500">Vui lòng đăng nhập để phản hồi.</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Similar Movies Section (Netflix style) */}
      {similarMovies.length > 0 && (
        <div className="max-w-6xl mx-auto w-full px-4 md:px-8 mt-20 text-left">
          <h2 className="text-xl font-extrabold text-white mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
            <Sparkles className="text-brand-gold" size={18} /> Phim Tương Tự
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
            {similarMovies.map(m => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </div>
      )}

      {/* Trailer Modal Overlay (AnimatePresence embed) */}
      <AnimatePresence>
        {isTrailerOpen && movie.trailerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <button
                onClick={() => setIsTrailerOpen(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full z-10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
              <iframe
                src={getEmbedUrl(movie.trailerUrl)}
                title={`${movie.title} Trailer`}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Booking Anchor Bar (appears when scrolling down) */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed bottom-0 inset-x-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-glass"
          >
            <div className="flex items-center gap-4 text-left">
              <img
                src={getImageUrl(movie.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=80'}
                alt={movie.title}
                className="w-9 h-12 rounded object-cover border border-white/10 hidden sm:block"
              />
              <div>
                <h4 className="text-sm font-bold text-white line-clamp-1">{movie.title}</h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{movie.language} • {movie.duration}m</p>
              </div>
            </div>
            <Button variant="primary" size="md" onClick={() => navigate(`/movie/${slug}/showtimes`)} className="shadow-brand">
              Đặt Vé Ngay
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
