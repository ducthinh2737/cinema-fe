import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import {
  MessageSquare,
  Search,
  Filter,
  Star,
  Check,
  EyeOff,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Clock,
  ThumbsUp
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { Review, Movie } from '../../types';

interface ReviewAnalytics {
  totalReviews: number;
  averageRating: number;
  verifiedReviews: number;
  pendingReviews: number;
  ratingDistribution: { stars: number; count: number }[];
  reviewsPerDay: { date: string; count: number }[];
  topRatedMovies: { movieTitle: string; averageRating: number; reviewsCount: number }[];
}

export const ReviewsManagement: React.FC = () => {
  const { showToast } = useToast();

  // Loading states
  const [loading, setLoading] = useState(false);

  // Data states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [stats, setStats] = useState<ReviewAnalytics | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Fetch movies for dropdown filter
  const fetchMovies = async () => {
    try {
      const res = await apiClient.get('/movies');
      const data = res.data?.data ?? res.data;
      const movieItems = data?.items ?? (Array.isArray(data) ? data : []);
      setMovies(movieItems);
    } catch (err) {
      console.error('Failed to load movies for filter', err);
    }
  };

  // Fetch review statistics / analytics
  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/reviews/statistics');
      const data = res.data?.data ?? res.data;
      setStats(data);
    } catch (err) {
      console.error('Failed to load review statistics', err);
    }
  };

  // Fetch reviews list based on query filters
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params: any = {
        pageNumber: page,
        pageSize,
        status: selectedStatus,
        verifiedOnly: verifiedOnly || undefined,
        searchKeyword: searchKeyword || undefined
      };

      if (selectedMovie) {
        params.movieId = parseInt(selectedMovie);
      }
      if (selectedRating) {
        params.rating = parseInt(selectedRating);
      }

      const res = await apiClient.get('/reviews', { params });
      const data = res.data;
      setReviews(data?.items || []);
      setTotalCount(data?.totalCount || 0);
    } catch (err) {
      console.error('Failed to load reviews list', err);
      showToast('Không thể tải danh sách đánh giá.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load
  useEffect(() => {
    fetchMovies();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [page, selectedMovie, selectedRating, selectedStatus, verifiedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const handleResetFilters = () => {
    setSelectedMovie('');
    setSelectedRating('');
    setSelectedStatus('All');
    setVerifiedOnly(false);
    setSearchKeyword('');
    setPage(1);
  };

  // Moderate status of review
  const handleUpdateStatus = async (reviewId: number, newStatus: string) => {
    try {
      const res = await apiClient.put(`/reviews/${reviewId}/status`, { status: newStatus });
      if (res.status === 200 || res.data?.isSuccess) {
        showToast(`Đã cập nhật trạng thái đánh giá thành: ${newStatus}`, 'success');
        // Refresh list & statistics
        fetchReviews();
        fetchStats();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.Message ?? 'Không thể cập nhật trạng thái.';
      showToast(errMsg, 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      
      {/* 1. Header Area */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-brand-gold flex items-center gap-2">
          <MessageSquare size={16} /> Quản Lý Ý Kiến Khán Giả
        </h3>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          Phê duyệt đánh giá người dùng, ẩn/xóa bình luận không phù hợp và theo dõi phân tích xếp hạng phim trực tuyến
        </span>
      </div>

      {/* 2. Analytics Cards Area */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <GlassCard className="p-4 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Tổng số Đánh Giá</span>
              <span className="text-xl font-black text-white">{stats.totalReviews}</span>
            </div>
            <div className="p-2.5 bg-brand/10 border border-brand/20 text-brand rounded-xl">
              <MessageSquare size={14} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Điểm Trung Bình</span>
              <span className="text-xl font-black text-brand-gold flex items-center gap-1">
                {stats.averageRating} <Star size={16} fill="#e5a93b" className="text-brand-gold" />
              </span>
            </div>
            <div className="p-2.5 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-xl">
              <TrendingUp size={14} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Đã Mua Vé (Verified)</span>
              <span className="text-xl font-black text-green-400">{stats.verifiedReviews}</span>
            </div>
            <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
              <Award size={14} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Chờ Kiểm Duyệt</span>
              <span className="text-xl font-black text-yellow-500">{stats.pendingReviews}</span>
            </div>
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl">
              <Clock size={14} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* 3. Analytics Charts (Using Recharts) */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chart 1: Rating Distribution */}
          <GlassCard className="p-5 border border-white/5 flex flex-col gap-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">Phân Phối Xếp Hạng</h4>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ratingDistribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="stars" tickFormatter={(v) => `${v}★`} stroke="#555" fontSize={9} />
                  <YAxis stroke="#555" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', fontSize: 10 }} />
                  <Bar dataKey="count" fill="#e5a93b" radius={[3, 3, 0, 0]}>
                    {stats.ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.stars >= 4 ? '#e5a93b' : entry.stars === 3 ? '#a855f7' : '#e50914'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Chart 2: Reviews Trend Per Day */}
          <GlassCard className="p-5 border border-white/5 flex flex-col gap-3 md:col-span-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">Xu Hướng Đánh Giá 7 Ngày Qua</h4>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.reviewsPerDay} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e50914" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.substring(5)} stroke="#555" fontSize={9} />
                  <YAxis stroke="#555" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', fontSize: 10 }} />
                  <Area type="monotone" dataKey="count" name="Số đánh giá" stroke="#e50914" strokeWidth={2} fillOpacity={1} fill="url(#colorReviews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 4. Filters Panel */}
      <GlassCard className="p-5 border border-white/5 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Filter size={14} className="text-brand-gold" />
          <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Bộ Lọc & Tìm Kiếm</h4>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          {/* Keyword search */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Từ khóa bình luận / Người dùng</label>
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm nội dung đánh giá..."
                className="w-full pl-9 pr-3 py-2 bg-[#121216]/50 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
              />
              <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          {/* Movie selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Chọn Phim</label>
            <select
              value={selectedMovie}
              onChange={(e) => setSelectedMovie(e.target.value)}
              className="w-full px-3 py-2 bg-[#121216]/50 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">Tất cả phim</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Rating filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Xếp Hạng</label>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="w-full px-3 py-2 bg-[#121216]/50 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">Tất cả sao</option>
              <option value="5">5 Sao ★★★★★</option>
              <option value="4">4 Sao ★★★★☆</option>
              <option value="3">3 Sao ★★★☆☆</option>
              <option value="2">2 Sao ★★☆☆☆</option>
              <option value="1">1 Sao ★☆☆☆☆</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Trạng Thái</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#121216]/50 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="All">Tất cả</option>
              <option value="Approved">Đã Duyệt (Approved)</option>
              <option value="Pending">Chờ Duyệt (Pending)</option>
              <option value="Hidden">Đã Ẩn (Hidden)</option>
              <option value="Deleted">Đã Xóa (Deleted)</option>
            </select>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-3.5">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded bg-black border-white/10 text-brand focus:ring-brand accent-brand h-4 w-4"
            />
            Chỉ hiển thị người xem đã đặt vé (Verified Viewer)
          </label>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleResetFilters} className="text-xs py-1.5 px-3 rounded-lg">
              Xóa Bộ Lọc
            </Button>
            <Button variant="primary" onClick={handleSearchSubmit} className="text-xs py-1.5 px-4 rounded-lg flex items-center gap-1.5">
              <Search size={12} /> Tìm Kiếm
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* 5. Reviews Table Area */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 text-brand-gold animate-spin" />
            <span className="text-xs text-gray-500 font-black uppercase tracking-wider">Đang tải danh sách đánh giá...</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
                <th className="p-4">Người Dùng</th>
                <th className="p-4">Phim</th>
                <th className="p-4">Xếp Hạng</th>
                <th className="p-4 text-center">Người Xem Thật</th>
                <th className="p-4 w-[35%]">Nội Dung Đánh Giá</th>
                <th className="p-4">Ngày Đăng</th>
                <th className="p-4 text-center">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500 font-bold uppercase tracking-wider">
                    Không tìm thấy đánh giá nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.reviewId} className="hover:bg-white/[0.01] transition-colors">
                    {/* User */}
                    <td className="p-4">
                      <span className="block font-bold text-white">{r.userName}</span>
                      <span className="text-[10px] text-gray-500 block font-mono">UID: #{r.userId}</span>
                    </td>
                    
                    {/* Movie */}
                    <td className="p-4 font-bold text-gray-200">{r.movieTitle}</td>
                    
                    {/* Rating */}
                    <td className="p-4 text-brand-gold font-bold">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </td>

                    {/* Verified Viewer */}
                    <td className="p-4 text-center">
                      {r.isVerifiedViewer ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 font-black uppercase tracking-wider">
                          ✓ Đã xem phim
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-bold">-</span>
                      )}
                    </td>

                    {/* Content */}
                    <td className="p-4 py-3 text-gray-300 leading-relaxed font-sans max-w-[200px] break-words">
                      {r.comment || <span className="text-gray-600 italic">Không có bình luận.</span>}
                      {r.likesCount > 0 && (
                        <span className="flex items-center gap-1 mt-1 text-[9px] text-gray-500">
                          <ThumbsUp size={8} /> {r.likesCount} Thích
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-gray-400 font-mono text-[10px]">
                      {new Date(r.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-block ${
                        r.status === 'Approved'
                          ? 'text-green-400 border-green-500/20 bg-green-500/5'
                          : r.status === 'Pending'
                          ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                          : r.status === 'Hidden'
                          ? 'text-purple-400 border-purple-500/20 bg-purple-500/5'
                          : 'text-brand border-brand/20 bg-brand/5'
                      }`}>
                        {r.status === 'Approved' ? 'Đã Duyệt' : r.status === 'Pending' ? 'Chờ Duyệt' : r.status === 'Hidden' ? 'Đã Ẩn' : 'Đã Xóa'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status !== 'Approved' && (
                          <button
                            onClick={() => handleUpdateStatus(r.reviewId, 'Approved')}
                            title="Duyệt bình luận"
                            className="p-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        {r.status !== 'Hidden' && (
                          <button
                            onClick={() => handleUpdateStatus(r.reviewId, 'Hidden')}
                            title="Ẩn bình luận"
                            className="p-1 rounded-md bg-[#ffffff]/05 border border-white/10 text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                          >
                            <EyeOff size={12} />
                          </button>
                        )}
                        {r.status !== 'Deleted' && (
                          <button
                            onClick={() => handleUpdateStatus(r.reviewId, 'Deleted')}
                            title="Xóa bình luận"
                            className="p-1 rounded-md bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 mt-2">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Hiển thị {reviews.length} / {totalCount} đánh giá (Trang {page} / {totalPages})
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-white/5 bg-[#0e0e12]/30 text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            
            {[...Array(totalPages)].map((_, idx) => {
              const pIdx = idx + 1;
              const isCurrent = pIdx === page;
              return (
                <button
                  key={pIdx}
                  onClick={() => setPage(pIdx)}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-brand text-white border border-brand'
                      : 'border border-white/5 bg-[#0e0e12]/30 text-gray-400 hover:text-white'
                  }`}
                >
                  {pIdx}
                </button>
              );
            })}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-white/5 bg-[#0e0e12]/30 text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
