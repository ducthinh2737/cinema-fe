import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient, getImageUrl } from '../../api/client';
import type { Movie, Review } from '../../types';
import { Button } from '../../components/ui/Button';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { MovieCard } from '../../components/movie/MovieCard';
import { Star, Play, Send, ThumbsUp, X, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);

  // Review inputs
  const [ratingScore, setRatingScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // States for interactive actions
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [loadingMovie, setLoadingMovie] = useState(true);

  const [localMeta, setLocalMeta] = useState<any>(null);

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

  // Fetch similar movies
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
      }
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Không thể gửi đánh giá. Có thể bạn đã đánh giá phim này rồi.';
      showToast(msg, 'error');
    }
  };

  const handleLikeReview = async (id: number) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thích đánh giá.', 'warning');
      return;
    }

    try {
      await apiClient.post(`/reviews/${id}/like`);
      setReviews(prev => prev.map(r => r.reviewId === id ? { ...r, likesCount: r.likesCount + 1 } : r));
      showToast('Đã thích đánh giá!', 'success');
    } catch (err) {
      console.error("Error liking review", err);
    }
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
              <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-lg border z-10 ${
                movie.ageRatingId === 1 ? 'bg-green-600/80 border-green-500/30 text-white' :
                movie.ageRatingId === 2 ? 'bg-blue-600/80 border-blue-500/30 text-white' :
                movie.ageRatingId === 3 ? 'bg-orange-500/80 border-orange-500/30 text-white' :
                movie.ageRatingId === 4 ? 'bg-red-500/80 border-red-500/30 text-white' :
                movie.ageRatingId === 5 ? 'bg-red-850 border-red-800/30 text-white' : 'bg-pink-800/80 border-pink-700/30 text-white'
              }`}>
                {['P', 'K', 'T13', 'T16', 'T18', 'C18'][(movie.ageRatingId ?? 1) - 1] || 'P'}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Title Info, Description, and Details Grid (Beta Cinemas style) */}
        <div className="md:col-span-3 flex flex-col gap-6 pt-6 md:pt-16">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
              {movie.title}
            </h1>
            
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

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                variant="primary"
                onClick={() => navigate(`/movie/${slug}/showtimes`)}
                className="shadow-brand font-black uppercase tracking-wider text-xs px-8 py-3.5 flex items-center gap-2"
              >
                <Sparkles size={14} className="text-brand-gold animate-pulse" /> Đặt Vé Ngay
              </Button>
            </div>
          </div>
        </div>

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
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Bình luận</span>
                <textarea
                  placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim này..."
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-3 bg-[#121216] border border-gray-800 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>

              <Button type="submit" variant="primary" fullWidth className="flex items-center gap-2">
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
          <div className="flex flex-col gap-4">
            {reviews.length === 0 ? (
              <span className="text-xs text-gray-500 py-8">Hãy là người đầu tiên đánh giá bộ phim này.</span>
            ) : (
              reviews.map((r) => (
                <div key={r.reviewId} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-extrabold text-gray-200">{r.userName}</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

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
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{r.comment || 'Không có bình luận.'}</p>

                  <button
                    onClick={() => handleLikeReview(r.reviewId)}
                    className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-brand transition-colors w-max"
                  >
                    <ThumbsUp size={12} />
                    <span>{r.likesCount} Thích</span>
                  </button>
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
