import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Cinema, Showtime } from '../../types';
import { CinemaHero } from '../../components/cinema/CinemaHero';
import { CinemaSidebar } from '../../components/cinema/CinemaSidebar';
import { CinemaInfo } from '../../components/cinema/CinemaInfo';
import { CinemaGallery } from '../../components/cinema/CinemaGallery';
import { CinemaShowtimes } from '../../components/cinema/CinemaShowtimes';
import { useToast } from '../../contexts/ToastContext';

export const CinemaDetails: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const cinemaIdParam = searchParams.get('cinemaId');

  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [activeCinemaId, setActiveCinemaId] = useState<number | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);

  const [cinemasLoading, setCinemasLoading] = useState(true);
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all cinemas on mount
  useEffect(() => {
    const fetchCinemas = async () => {
      setCinemasLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<any>('/cinemas', {
          params: { PageSize: 100 }
        });
        const responseData = res.data?.data ?? res.data;
        const cinemaItems = responseData?.items ?? (Array.isArray(responseData) ? responseData : []);
        if (cinemaItems.length > 0) {
          const mapped = cinemaItems.map((c: any) => ({
            cinemaId: c.cinemaId,
            name: c.cinemaName || c.name || '',
            address: c.address,
            city: c.cityName || (c.cityId === 1 ? 'Hồ Chí Minh' : c.cityId === 2 ? 'Hà Nội' : c.cityId === 3 ? 'Đà Nẵng' : 'Nha Trang'),
            imageUrl: c.imageUrl,
            logoUrl: c.logoUrl,
            bannerUrl: c.bannerUrl,
            galleryUrls: c.galleryUrls,
            phone: c.phone || c.telephone || '',
            email: c.email || ''
          }));
          setCinemas(mapped);

          const targetId = cinemaIdParam ? parseInt(cinemaIdParam, 10) : null;
          const targetCinema = targetId ? mapped.find((c: any) => c.cinemaId === targetId) : null;

          setActiveCinemaId(targetCinema ? targetCinema.cinemaId : mapped[0].cinemaId);
        } else {
          setError('Không tìm thấy dữ liệu cụm rạp trên hệ thống.');
        }
      } catch (err: any) {
        console.error('Failed to fetch cinemas', err);
        setError('Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại sau.');
        showToast('Không thể tải danh sách cụm rạp.', 'error');
      } finally {
        setCinemasLoading(false);
      }
    };

    fetchCinemas();
  }, []);

  // Fetch showtimes when activeCinemaId changes
  useEffect(() => {
    if (!activeCinemaId) return;

    const fetchShowtimes = async () => {
      setShowtimesLoading(true);
      try {
        const res = await apiClient.get(`/showtimes/cinema/${activeCinemaId}`);
        // Backend returns ApiResponse<IEnumerable<ShowtimeDto>> — unwrap .data
        const items = res.data?.data ?? res.data ?? [];
        setShowtimes(Array.isArray(items) ? items : []);
      } catch (err: any) {
        console.error('Failed to fetch showtimes for cinema', err);
        setShowtimes([]);
        showToast('Không thể tải lịch chiếu của cụm rạp này.', 'error');
      } finally {
        setShowtimesLoading(false);
      }
    };

    fetchShowtimes();
  }, [activeCinemaId]);

  // Synchronize activeCinemaId with query param if it changes
  useEffect(() => {
    if (cinemaIdParam && cinemas.length > 0) {
      const targetId = parseInt(cinemaIdParam, 10);
      const targetCinema = cinemas.find(c => c.cinemaId === targetId);
      if (targetCinema) {
        setActiveCinemaId(targetCinema.cinemaId);
      }
    }
  }, [cinemaIdParam, cinemas]);

  const handleSelectCinema = (id: number) => {
    setActiveCinemaId(id);
  };

  const activeCinema = cinemas.find(c => c.cinemaId === activeCinemaId) || null;

  // Map url for Iframe Embed
  const mapEmbedUrl = activeCinema
    ? `https://maps.google.com/maps?q=${encodeURIComponent(activeCinema.address + ' ' + (activeCinema.name || activeCinema.cinemaName || ''))}&t=&z=16&ie=UTF8&iwloc=&output=embed`
    : '';

  return (
    <div id="cinema-details-root" className="flex flex-col min-h-screen bg-background pb-16 text-gray-200">
      {/* 1. Cinematic Hero Header */}
      <CinemaHero cinema={activeCinema} loading={cinemasLoading} />

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 mt-8 md:mt-12 flex flex-col gap-10">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs font-semibold text-left">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 2. Left Column: Cinema selection List (Tabs/Sidebar) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex flex-col text-left mb-1">
              <h3 className="text-sm font-black uppercase text-white tracking-wider pl-1">Danh Sách Hệ Thống Rạp</h3>
              <p className="text-[11px] text-gray-400 mt-1 pl-1">Chọn rạp để xem chi tiết thông tin và suất chiếu tương ứng.</p>
            </div>
            <CinemaSidebar
              cinemas={cinemas}
              activeCinemaId={activeCinemaId}
              onSelectCinema={handleSelectCinema}
              loading={cinemasLoading}
            />
          </div>

          {/* Right Column: Display Active Cinema Specifications */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* 3. Lịch Chiếu Phim Section */}
            <CinemaShowtimes showtimes={showtimes} loading={showtimesLoading} />

            {/* 4. Thông tin Chi Tiết Rạp */}
            <CinemaInfo cinema={activeCinema} loading={cinemasLoading} />

            {/* 5. Thư viện hình ảnh */}
            {activeCinema && <CinemaGallery cinema={activeCinema} />}

            {/* 7. Google Maps Embed Iframe */}
            {activeCinema && (
              <div className="text-left flex flex-col gap-6 relative">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Bản Đồ Vị Trí
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Định vị đường đi chi tiết tới {activeCinema.name}.</p>
                </div>

                <div className="relative w-full h-[300px] md:h-[380px] rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                  {showtimesLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-gray-400 gap-2">
                      <Loader2 size={16} className="animate-spin text-brand" /> Đang cập nhật vị trí bản đồ...
                    </div>
                  ) : (
                    <iframe
                      src={mapEmbedUrl}
                      title={`Bản đồ đường đi tới ${activeCinema.name}`}
                      className="w-full h-full border-0 filter invert-[0.9] hue-rotate-[180deg] brightness-[0.95] contrast-[1.1] grayscale-[30%]"
                      allowFullScreen={true}
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CinemaDetails;
