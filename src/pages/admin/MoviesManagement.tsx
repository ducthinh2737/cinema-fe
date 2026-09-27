import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Film, Plus, RotateCcw, Download } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import type { Movie, Genre } from '../../types';
import { getAgeRatingCode } from '../../utils/ageRatingHelpers';
import {
  MovieTable,
  AdminMovieCard,
  MovieModal,
  MovieDrawer,
  MovieFilters,
  MovieAnalytics,
  DeleteMovieModal,
  MovieSkeleton
} from '../../components/admin';
import type {
  MovieStatus,
  SortField,
  SortOrder
} from '../../components/admin';

export const MoviesManagement: React.FC = () => {
  const { showToast } = useToast();

  // Primary datasets states
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);

  // Search, Filter, Sort and Page pagination states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedAgeRating, setSelectedAgeRating] = useState<string>('');
  const [isFeatured, setIsFeatured] = useState<boolean | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Modal and details drawer view togglers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'info' | 'media' | 'specs' | 'showtimes'>('info');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMovie, setDrawerMovie] = useState<Movie | null>(null);
  const [saving, setSaving] = useState(false);
  const [realStats, setRealStats] = useState<any[]>([]);

  // Debounce search string input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load primary movie catalog and genre arrays
  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch actual stats from top-movies endpoint
      const statsRes = await apiClient.get<any>('/Admin/top-movies', {
        params: { limit: 100 }
      }).catch((err) => {
        console.error('Failed to load real movie statistics:', err);
        return { data: { data: [] } };
      });
      
      const statsData = statsRes.data?.data ?? statsRes.data ?? [];
      setRealStats(Array.isArray(statsData) ? statsData : []);

      const response = await apiClient.get<any>('/movies', {
        params: {
          SearchTerm: debouncedSearch || undefined,
          GenreId: selectedGenreId || undefined,
          PageNumber: 1,
          PageSize: 100, // Fetch all locally to allow advanced client sorting/filtering simulated data
        },
      });

      const responseData = response.data?.data ?? response.data;
      const movieItems = responseData?.items ?? (Array.isArray(responseData) ? responseData : []);
      
      setMovies(movieItems);
    } catch (error) {
      console.error('Failed to load movies from backend:', error);
      showToast('Không thể tải danh sách phim từ máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedGenreId, showToast]);

  const fetchGenres = useCallback(async () => {
    try {
      const response = await apiClient.get<Genre[]>('/genres');
      setGenres(response.data);
    } catch (error) {
      console.error('Failed to fetch genre classifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedGenreId, selectedStatus, selectedLanguage, selectedCountry, selectedAgeRating, isFeatured]);

  // Dynamically map a status string based on dates
  const getMovieStatus = useCallback((movie: Movie): MovieStatus => {
    if ((movie as any).status === 'Hidden') return 'Hidden';
    const now = new Date().getTime();
    const release = new Date(movie.releaseDate).getTime();
    const end = new Date(movie.endDate).getTime();

    if (now < release) return 'ComingSoon';
    if (now > end) return 'Ended';
    return 'NowShowing';
  }, []);

  // Compute booking tickets count and real revenues from top-movies stats
  const getMovieStats = useCallback((movieId: number) => {
    const stat = realStats.find((s: any) => (s.movieId === movieId || s.MovieId === movieId));
    if (stat) {
      return {
        bookingCount: stat.ticketsSold || stat.TicketsSold || 0,
        revenue: stat.revenue || stat.Revenue || 0
      };
    }
    return { bookingCount: 0, revenue: 0 };
  }, [realStats]);

  // Handler sorting actions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter client-side variables
  const processedMovies = useMemo(() => {
    let result = [...movies];

    // Filter statuses
    if (selectedStatus) {
      result = result.filter(m => getMovieStatus(m) === selectedStatus);
    }

    // Filter language
    if (selectedLanguage) {
      result = result.filter(m => m.language === selectedLanguage);
    }

    // Filter country
    if (selectedCountry) {
      result = result.filter(m => {
        const metaStr = localStorage.getItem(`movie_meta_${m.id}`);
        if (metaStr) {
          try {
            const meta = JSON.parse(metaStr);
            return meta.country === selectedCountry;
          } catch (e) {}
        }
        return selectedCountry === 'Mỹ';
      });
    }

    // Filter age rating
    if (selectedAgeRating) {
      result = result.filter(m => {
        const code = getAgeRatingCode(m.ageRatingId);
        return code === selectedAgeRating;
      });
    }

    // Filter featured flag
    if (isFeatured !== '') {
      result = result.filter(m => (m as any).isFeatured === isFeatured);
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField as keyof Movie] || '';
      let valB: any = b[sortField as keyof Movie] || '';

      if (sortField === 'revenue') {
        valA = getMovieStats(a.id).revenue;
        valB = getMovieStats(b.id).revenue;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      return sortOrder === 'asc' 
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return result;
  }, [movies, selectedStatus, selectedLanguage, selectedCountry, selectedAgeRating, isFeatured, sortField, sortOrder, getMovieStatus, getMovieStats]);

  // Paginated client output
  const paginatedMovies = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return processedMovies.slice(startIdx, startIdx + pageSize);
  }, [processedMovies, page, pageSize]);

  const totalPages = Math.ceil(processedMovies.length / pageSize);

  // Compute overall KPI cards metrics
  const analyticsData = useMemo(() => {
    let total = movies.length;
    let nowShowing = 0;
    let comingSoon = 0;
    let maxBooking = 0;
    let mostBookedTitle = '';
    let totalRevenue = 0;

    movies.forEach(m => {
      const status = getMovieStatus(m);
      if (status === 'NowShowing') nowShowing++;
      if (status === 'ComingSoon') comingSoon++;

      const stats = getMovieStats(m.id);
      totalRevenue += stats.revenue;

      if (stats.bookingCount > maxBooking) {
        maxBooking = stats.bookingCount;
        mostBookedTitle = m.title;
      }
    });

    return { total, nowShowing, comingSoon, mostBookedTitle, totalRevenue };
  }, [movies, getMovieStatus, getMovieStats]);

  // Operations CRUD logic
  const handleOpenAdd = () => {
    localStorage.removeItem('movie_meta_temp');
    setSelectedMovie(null);
    setModalDefaultTab('info');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (movie: Movie) => {
    setSelectedMovie(movie);
    setModalDefaultTab('info');
    setIsFormOpen(true);
  };

  const handleManageShowtimes = (movie: Movie) => {
    setSelectedMovie(movie);
    setModalDefaultTab('showtimes');
    setIsFormOpen(true);
  };

  const handleSave = async (values: any, posterFile?: File | null, bannerFile?: File | null) => {
    setSaving(true);
    try {
      let savedMovie: any = null;
      if (selectedMovie) {
        // Edit Mode PUT
        const res = await apiClient.put<any>(`/movies/${selectedMovie.id}`, {
          ...values,
          id: selectedMovie.id,
          slug: selectedMovie.slug,
        });
        savedMovie = res.data?.data ?? res.data;

        // Upload poster if selected
        if (posterFile) {
          const formData = new FormData();
          formData.append('file', posterFile);
          await apiClient.post(`/movies/${selectedMovie.id}/upload-poster`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        // Upload banner if selected
        if (bannerFile) {
          const formData = new FormData();
          formData.append('file', bannerFile);
          await apiClient.post(`/movies/${selectedMovie.id}/upload-banner`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        showToast('Thông tin phim đã được chỉnh sửa thành công.', 'success');
      } else {
        // Create Mode POST
        const res = await apiClient.post<any>('/movies', values);
        savedMovie = res.data?.data ?? res.data;
        const newId = savedMovie?.id;

        if (newId) {
          // Upload poster if selected
          if (posterFile) {
            const formData = new FormData();
            formData.append('file', posterFile);
            await apiClient.post(`/movies/${newId}/upload-poster`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          }

          // Upload banner if selected
          if (bannerFile) {
            const formData = new FormData();
            formData.append('file', bannerFile);
            await apiClient.post(`/movies/${newId}/upload-banner`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          }
        }

        showToast('Phim mới đã được thêm thành công.', 'success');
        localStorage.removeItem('movie_meta_temp');
      }
      setIsFormOpen(false);
      fetchMovies();
      return savedMovie;
    } catch (error: any) {
      console.error('Error saving movie payload:', error);
      showToast(error.response?.data?.Message || 'Lỗi lưu thông tin phim.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrigger = (id: number) => {
    const movie = movies.find(m => m.id === id) || null;
    setMovieToDelete(movie);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!movieToDelete) return;
    setSaving(true);
    try {
      await apiClient.delete(`/movies/${movieToDelete.id}`);
      showToast('Đã xóa phim khỏi danh sách.', 'success');
      setIsDeleteOpen(false);
      fetchMovies();
    } catch (error) {
      console.error('Error deleting movie:', error);
      showToast('Lỗi khi xóa phim khỏi hệ thống.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClone = (movie: Movie) => {
    // Open creation modal pre-filled but clearing id/slug
    const clonedMovie: Movie = {
      ...movie,
      id: 0,
      title: `Copy of ${movie.title}`,
      slug: `copy-of-${movie.slug}`,
    };
    setSelectedMovie(clonedMovie);
    setIsFormOpen(true);
  };

  const handleToggleHide = async (movie: Movie) => {
    try {
      const currentStatus = (movie as any).status;
      const targetStatus = currentStatus === 'Hidden' ? 'NowShowing' : 'Hidden';
      
      await apiClient.put(`/movies/${movie.id}`, {
        ...movie,
        status: targetStatus
      });

      showToast(
        targetStatus === 'Hidden' ? 'Đã ẩn phim khỏi khách hàng.' : 'Đã hiện phim lên trang chủ.', 
        'success'
      );
      fetchMovies();
    } catch (err) {
      console.error("Failed to toggle movie hide visibility:", err);
      showToast("Lỗi thay đổi trạng thái ẩn hiện phim.", "error");
    }
  };

  const handleSelectMovie = (movie: Movie) => {
    setDrawerMovie(movie);
    setIsDrawerOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Mã phim', 'Tên phim', 'Thể loại', 'Thời lượng (phút)', 'Ngôn ngữ', 'Ngày khởi chiếu', 'Ngày kết thúc', 'Điểm đánh giá', 'Trạng thái', 'Vé đã bán', 'Doanh thu (đ)'];
    const rows = processedMovies.map(m => {
      const stats = getMovieStats(m.id);
      const ratingCode = getAgeRatingCode(m.ageRatingId);
      return [
        m.id,
        `"${m.title.replace(/"/g, '""')}"`,
        `"${(m.genreName || m.genre?.genreName || 'Chưa Phân Loại').replace(/"/g, '""')}"`,
        m.duration,
        `"${m.language.replace(/"/g, '""')}"`,
        new Date(m.releaseDate).toLocaleDateString('vi-VN'),
        new Date(m.endDate).toLocaleDateString('vi-VN'),
        m.rating,
        ratingCode,
        stats.bookingCount,
        stats.revenue
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_phim_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Xuất tệp Excel (CSV) thành công.', 'success');
  };

  return (
    <div className="flex flex-col gap-8 pb-12 select-none">
      
      {/* 1. Cinematic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 border-b border-white/5 pb-6">
        <div className="text-left">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
            <Film className="text-brand animate-pulse" size={24} /> Quản Lý Phim Điện Ảnh
          </h2>
          <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider mt-1 block">
            Bảng điều khiển quản trị rạp chiếu phim chuẩn enterprise-level
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-bold uppercase py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-brand-gold border-brand-gold/10"
            title="Xuất Excel"
          >
            <Download size={13} /> Xuất Excel
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchMovies}
            className="flex items-center gap-1.5 text-xs font-bold uppercase py-2.5 rounded-xl bg-white/5 hover:bg-white/10"
            title="Đồng bộ"
          >
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} /> Tải lại
          </Button>

          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleOpenAdd} 
            className="flex items-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider py-2.5 rounded-xl"
          >
            <Plus size={14} /> Thêm Phim Mới
          </Button>
        </div>
      </div>

      {/* 2. Key Analytics KPI Cards */}
      <MovieAnalytics
        totalMovies={analyticsData.total}
        nowShowing={analyticsData.nowShowing}
        comingSoon={analyticsData.comingSoon}
        mostBookedMovie={analyticsData.mostBookedTitle}
        totalRevenue={analyticsData.totalRevenue}
      />

      {/* 3. Filters block */}
      <MovieFilters
        search={search}
        onSearchChange={setSearch}
        selectedGenreId={selectedGenreId}
        onGenreChange={setSelectedGenreId}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        selectedAgeRating={selectedAgeRating}
        onAgeRatingChange={setSelectedAgeRating}
        isFeatured={isFeatured}
        onFeaturedChange={setIsFeatured}
        genres={genres}
      />

      {/* 4. Display tables / Grid content */}
      <div className="w-full">
        {loading ? (
          <MovieSkeleton viewType="table" count={pageSize} />
        ) : processedMovies.length === 0 ? (
          // Empty State illustration
          <div className="bg-[#0e0e12]/30 border border-white/5 p-16 rounded-3xl text-center flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-white/5 border border-white/5 rounded-full flex items-center justify-center text-gray-500 animate-bounce">
              <Film size={28} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Không Tìm Thấy Phim</h3>
              <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto font-medium">
                Không tìm thấy dữ liệu phim tương ứng với các bộ lọc của bạn trong hệ thống. Hãy thử thay đổi tham số lọc hoặc tạo phim mới.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="mt-2 text-xs font-bold uppercase"
            >
              Thêm phim mới ngay
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <MovieTable
                movies={paginatedMovies}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteTrigger}
                onSelect={handleSelectMovie}
                onClone={handleClone}
                onToggleHide={handleToggleHide}
                onManageShowtimes={handleManageShowtimes}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                getStatus={getMovieStatus}
                getStats={getMovieStats}
              />
            </div>

            {/* Mobile Grid Card View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {paginatedMovies.map(movie => (
                <AdminMovieCard
                  key={movie.id}
                  movie={movie}
                  status={getMovieStatus(movie)}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteTrigger}
                  onSelect={handleSelectMovie}
                  onManageShowtimes={handleManageShowtimes}
                  bookingCount={getMovieStats(movie.id).bookingCount}
                  revenue={getMovieStats(movie.id).revenue}
                />
              ))}
            </div>

            {/* 5. Pagination navigation footer */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center text-xs font-black text-gray-500 uppercase tracking-widest mt-2 border-t border-white/5 pt-4">
                <span>Trang {page} trên {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="text-[10px] font-black uppercase py-2 px-4 rounded-xl"
                  >
                    Trước
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    className="text-[10px] font-black uppercase py-2 px-4 rounded-xl"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Editor Modal */}
      <MovieModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        selectedMovie={selectedMovie}
        genres={genres}
        saving={saving}
        defaultTab={modalDefaultTab}
      />

      {/* Confirmation delete alert */}
      <DeleteMovieModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        movieTitle={movieToDelete?.title || ''}
        loading={saving}
      />

      {/* Details sidebar drawer */}
      <MovieDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        movie={drawerMovie}
        bookingCount={drawerMovie ? getMovieStats(drawerMovie.id).bookingCount : 0}
        revenue={drawerMovie ? getMovieStats(drawerMovie.id).revenue : 0}
        chartData={drawerMovie ? [
          { name: 'Tuần 1', revenue: Math.round(getMovieStats(drawerMovie.id).revenue * 0.30), tickets: Math.round(getMovieStats(drawerMovie.id).bookingCount * 0.30) },
          { name: 'Tuần 2', revenue: Math.round(getMovieStats(drawerMovie.id).revenue * 0.45), tickets: Math.round(getMovieStats(drawerMovie.id).bookingCount * 0.45) },
          { name: 'Tuần 3', revenue: Math.round(getMovieStats(drawerMovie.id).revenue * 0.15), tickets: Math.round(getMovieStats(drawerMovie.id).bookingCount * 0.15) },
          { name: 'Tuần 4', revenue: Math.round(getMovieStats(drawerMovie.id).revenue * 0.10), tickets: Math.round(getMovieStats(drawerMovie.id).bookingCount * 0.10) }
        ] : []}
      />

    </div>
  );
};
export default MoviesManagement;
