import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Upload,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Armchair,
  Calendar,
  Activity,
  PlusCircle,
  Image as ImageIcon,
  Map,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import dayjs from 'dayjs';
import { parseApiDate } from '../../utils/dateHelpers';
import { apiClient, getImageUrl } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import type { Cinema, Hall } from '../../types';

export const CinemasManagement: React.FC = () => {
  const { showToast } = useToast();
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(false);

  // Search, Filters & Sorting
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 5;

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalCinemas: 0,
    totalHalls: 0,
    totalSeats: 0,
    activeCinemas: 0,
    todayShowtimes: 0,
  });

  // Cities List (loaded dynamically from API)
  const [cities, setCities] = useState<{ cityId: number; cityName: string }[]>([]);

  // Expanded Row State
  const [expandedCinemaId, setExpandedCinemaId] = useState<number | null>(null);
  const [expandedHalls, setExpandedHalls] = useState<Hall[]>([]);
  const [loadingExpandedHalls, setLoadingExpandedHalls] = useState(false);
  const [expandedShowtimes, setExpandedShowtimes] = useState<any[]>([]);
  const [loadingExpandedShowtimes, setLoadingExpandedShowtimes] = useState(false);

  // Manage Halls Modal/Drawer States
  const [isHallsOpen, setIsHallsOpen] = useState(false);
  const [selectedCinemaForHalls, setSelectedCinemaForHalls] = useState<Cinema | null>(null);
  const [hallsList, setHallsList] = useState<Hall[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(false);
  const [hallTypes, setHallTypes] = useState<any[]>([]);
  
  // Single Hall CRUD Form
  const [isEditingHall, setIsEditingHall] = useState(false);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [hallForm, setHallForm] = useState({
    hallName: '',
    hallTypeId: 1,
    capacity: 50,
    description: '',
  });
  const [savingHall, setSavingHall] = useState(false);

  // Cinema Create/Edit Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'operation' | 'images'>('basic');
  const [saving, setSaving] = useState(false);

  // Local File Upload Prefabs (Create Mode)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Immediate Upload States (Edit Mode)
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Delete Modal States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [cinemaToDelete, setCinemaToDelete] = useState<number | null>(null);

  // Cinema Form State
  const [form, setForm] = useState({
    cinemaName: '',
    address: '',
    cityId: 1,
    status: 'Active',
    openingTime: '08:00',
    closingTime: '23:30',
    googleMapsUrl: '',
    latitude: 10.762622,
    longitude: 106.660172,
    phone: '',
    email: '',
    logoUrl: '',
    bannerUrl: '',
    galleryUrls: ''
  });

  // Calculate & load dashboard stats from complete items list
  const loadDashboardStats = async () => {
    try {
      // 1. Fetch all cinemas to compute total statistics
      const allCinemasRes = await apiClient.get<any>('/cinemas', {
        params: { PageNumber: 1, PageSize: 1000 }
      });
      const data = allCinemasRes.data?.data ?? allCinemasRes.data;
      const items = data?.items ?? (Array.isArray(data) ? data : []);

      const totalCinemas = data?.totalCount ?? items.length;
      const activeCinemas = items.filter((c: any) => c.status === 'Active').length;
      const totalHalls = items.reduce((sum: number, c: any) => sum + (c.hallCount || 0), 0);
      const totalSeats = items.reduce((sum: number, c: any) => sum + (c.seatCount || 0), 0);

      // 2. Fetch today's showtimes count
      const todayStr = dayjs().format('YYYY-MM-DD');
      const showtimesRes = await apiClient.get<any>('/showtimes', {
        params: { Date: todayStr, PageSize: 1 }
      });
      const stData = showtimesRes.data?.data ?? showtimesRes.data;
      const todayShowtimes = stData?.totalCount ?? 0;

      setStats({
        totalCinemas,
        totalHalls,
        totalSeats,
        activeCinemas,
        todayShowtimes
      });
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
    }
  };

  // Fetch list of cinemas
  const fetchCinemas = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/cinemas', {
        params: {
          Search: search || undefined,
          CityId: cityFilter === 'ALL' ? undefined : cityFilter,
          Status: statusFilter === 'ALL' ? undefined : statusFilter,
          SortBy: sortBy,
          PageNumber: page,
          PageSize: pageSize,
        },
      });

      const responseData = response.data?.data ?? response.data;
      const cinemaItems = responseData?.items ?? (Array.isArray(responseData) ? responseData : []);

      const mapped = cinemaItems.map((item: any) => ({
        cinemaId: item.cinemaId,
        name: item.cinemaName,
        address: item.address,
        city: item.cityName || (item.cityId === 1 ? 'Hồ Chí Minh' : 'Hà Nội'),
        imageUrl: item.imageUrl,
        cityId: item.cityId,
        status: item.status || 'Active',
        openingTime: item.openingTime,
        closingTime: item.closingTime,
        googleMapsUrl: item.googleMapsUrl,
        latitude: item.latitude,
        longitude: item.longitude,
        logoUrl: item.logoUrl,
        bannerUrl: item.bannerUrl,
        galleryUrls: item.galleryUrls,
        phone: item.phone,
        email: item.email,
        hallCount: item.hallCount,
        seatCount: item.seatCount,
        createdAt: item.createdAt,
      }));

      setCinemas(mapped);
      setTotalCount(responseData?.totalCount ?? 0);
      loadDashboardStats();
    } catch (error) {
      console.error('Failed to fetch cinemas', error);
      showToast('Không thể tải danh sách rạp chiếu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCinemas();
  }, [search, cityFilter, statusFilter, sortBy, page]);

  // Fetch cities once on mount
  const fetchCities = async () => {
    try {
      const response = await apiClient.get<any[]>('/cities');
      setCities(response.data || []);
    } catch (e) {
      console.error('Failed to load cities, using fallback.', e);
      setCities([
        { cityId: 1, cityName: 'Hồ Chí Minh' },
        { cityId: 2, cityName: 'Hà Nội' },
        { cityId: 3, cityName: 'Đà Nẵng' },
        { cityId: 4, cityName: 'Nha Trang' },
      ]);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  // Load hall types once
  const fetchHallTypes = async () => {
    try {
      const response = await apiClient.get<any[]>('/halltypes');
      setHallTypes(response.data || []);
    } catch (e) {
      console.error('Failed to load hall types', e);
    }
  };

  useEffect(() => {
    fetchHallTypes();
  }, []);

  // Quick toggle status change in table row
  const handleQuickStatusChange = async (cinemaId: number, newStatus: string) => {
    try {
      const cinema = cinemas.find(c => c.cinemaId === cinemaId);
      if (!cinema) return;

      const payload = {
        cinemaName: cinema.name,
        address: cinema.address,
        cityId: cinema.cityId || 1,
        status: newStatus,
        openingTime: cinema.openingTime,
        closingTime: cinema.closingTime,
        googleMapsUrl: cinema.googleMapsUrl,
        latitude: cinema.latitude,
        longitude: cinema.longitude,
        logoUrl: cinema.logoUrl,
        bannerUrl: cinema.bannerUrl,
        galleryUrls: cinema.galleryUrls,
        phone: cinema.phone,
        email: cinema.email
      };

      await apiClient.put(`/cinemas/${cinemaId}`, payload);
      showToast('Đã cập nhật trạng thái rạp chiếu.', 'success');
      fetchCinemas();
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.Message || 'Lỗi khi cập nhật trạng thái.', 'error');
    }
  };

  // Expand / collapse details
  const handleToggleExpand = async (cinemaId: number) => {
    if (expandedCinemaId === cinemaId) {
      setExpandedCinemaId(null);
      return;
    }

    setExpandedCinemaId(cinemaId);
    setLoadingExpandedHalls(true);
    setLoadingExpandedShowtimes(true);

    try {
      const hallsRes = await apiClient.get<any>(`/cinemas/${cinemaId}/halls`);
      const hallsData = hallsRes.data?.data ?? hallsRes.data ?? [];
      const mappedHalls = (Array.isArray(hallsData) ? hallsData : []).map((h: any) => ({
        hallId: h.hallId,
        cinemaId: h.cinemaId,
        name: h.hallName,
        hallTypeName: h.hallTypeName,
        capacity: h.capacity,
        description: h.description,
      }));
      setExpandedHalls(mappedHalls);
    } catch (e) {
      console.error(e);
      setExpandedHalls([]);
    } finally {
      setLoadingExpandedHalls(false);
    }

    try {
      const showtimesRes = await apiClient.get<any>(`/showtimes/cinema/${cinemaId}`);
      const stData = showtimesRes.data?.data ?? showtimesRes.data ?? [];
      const now = new Date();
      // Filter for future showtimes only
      const upcoming = (Array.isArray(stData) ? stData : [])
        .filter((st: any) => new Date(st.startTime) > now)
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 5); // display next 5 showtimes
      setExpandedShowtimes(upcoming);
    } catch (e) {
      console.error(e);
      setExpandedShowtimes([]);
    } finally {
      setLoadingExpandedShowtimes(false);
    }
  };

  // Manage Halls List Fetch
  const fetchHallsForCinema = async (cinemaId: number) => {
    setLoadingHalls(true);
    try {
      const res = await apiClient.get<any>(`/cinemas/${cinemaId}/halls`);
      const data = res.data?.data ?? res.data ?? [];
      const mapped = (Array.isArray(data) ? data : []).map((h: any) => ({
        hallId: h.hallId,
        cinemaId: h.cinemaId,
        name: h.hallName,
        hallTypeName: h.hallTypeName,
        capacity: h.capacity,
        description: h.description,
      }));
      setHallsList(mapped);
    } catch (err) {
      console.error(err);
      setHallsList([]);
    } finally {
      setLoadingHalls(false);
    }
  };

  // Open Hall Management Drawer
  const handleOpenHallsManager = (cinema: Cinema) => {
    setSelectedCinemaForHalls(cinema);
    fetchHallsForCinema(cinema.cinemaId);
    setHallForm({
      hallName: '',
      hallTypeId: hallTypes[0]?.hallTypeId || 1,
      capacity: 100,
      description: '',
    });
    setIsEditingHall(false);
    setSelectedHall(null);
    setIsHallsOpen(true);
  };

  // Add / Edit Hall Submission
  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCinemaForHalls) return;

    if (!hallForm.hallName.trim()) {
      showToast('Vui lòng nhập tên phòng chiếu.', 'warning');
      return;
    }

    setSavingHall(true);
    try {
      if (isEditingHall && selectedHall) {
        // Update Hall
        const payload = {
          hallName: hallForm.hallName,
          hallTypeId: hallForm.hallTypeId,
          capacity: hallForm.capacity,
          description: hallForm.description
        };
        await apiClient.put(`/halls/${selectedHall.hallId}`, payload);
        showToast('Cập nhật phòng chiếu thành công.', 'success');
      } else {
        // Create Hall
        const payload = {
          cinemaId: selectedCinemaForHalls.cinemaId,
          hallName: hallForm.hallName,
          hallTypeId: hallForm.hallTypeId,
          capacity: hallForm.capacity,
          description: hallForm.description
        };
        await apiClient.post('/halls', payload);
        showToast('Tạo mới phòng chiếu thành công.', 'success');
      }

      // Reset Form and reload halls
      setHallForm({
        hallName: '',
        hallTypeId: hallTypes[0]?.hallTypeId || 1,
        capacity: 100,
        description: '',
      });
      setIsEditingHall(false);
      setSelectedHall(null);
      fetchHallsForCinema(selectedCinemaForHalls.cinemaId);
      
      // Update main table
      fetchCinemas();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.Message || 'Lỗi khi lưu phòng chiếu.', 'error');
    } finally {
      setSavingHall(false);
    }
  };

  // Delete Hall
  const handleDeleteHall = async (hallId: number) => {
    if (!selectedCinemaForHalls) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng chiếu này?')) return;

    try {
      await apiClient.delete(`/halls/${hallId}`);
      showToast('Đã xóa phòng chiếu khỏi hệ thống.', 'success');
      fetchHallsForCinema(selectedCinemaForHalls.cinemaId);
      fetchCinemas();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.Message || 'Không thể xóa phòng chiếu.';
      showToast(msg, 'error');
    }
  };

  // Edit Hall button click
  const handleEditHallClick = (hall: Hall) => {
    setSelectedHall(hall);
    setIsEditingHall(true);
    // Find the hallTypeId matching the typeName
    const type = hallTypes.find(t => t.typeName === hall.hallTypeName);
    setHallForm({
      hallName: hall.name,
      hallTypeId: type?.hallTypeId || 1,
      capacity: hall.capacity || 100,
      description: hall.description || '',
    });
  };

  // Reset Add/Edit Form
  const resetFilePreviews = () => {
    setLogoFile(null);
    setBannerFile(null);
    setGalleryFiles([]);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    galleryPreviews.forEach(url => URL.revokeObjectURL(url));
    setLogoPreview(null);
    setBannerPreview(null);
    setGalleryPreviews([]);
  };

  const handleOpenAdd = () => {
    setSelectedCinema(null);
    resetFilePreviews();
    setForm({
      cinemaName: '',
      address: '',
      cityId: 1,
      status: 'Active',
      openingTime: '08:00',
      closingTime: '23:30',
      googleMapsUrl: '',
      latitude: 10.762622,
      longitude: 106.660172,
      phone: '',
      email: '',
      logoUrl: '',
      bannerUrl: '',
      galleryUrls: ''
    });
    setActiveTab('basic');
    setIsOpen(true);
  };

  const handleOpenEdit = (cinema: Cinema) => {
    setSelectedCinema(cinema);
    resetFilePreviews();
    setForm({
      cinemaName: cinema.name,
      address: cinema.address,
      cityId: cinema.cityId || 1,
      status: cinema.status || 'Active',
      openingTime: cinema.openingTime || '08:00',
      closingTime: cinema.closingTime || '23:30',
      googleMapsUrl: cinema.googleMapsUrl || '',
      latitude: cinema.latitude || 10.762622,
      longitude: cinema.longitude || 106.660172,
      phone: cinema.phone || '',
      email: cinema.email || '',
      logoUrl: cinema.logoUrl || '',
      bannerUrl: cinema.bannerUrl || '',
      galleryUrls: cinema.galleryUrls || ''
    });
    setActiveTab('basic');
    setIsOpen(true);
  };

  // Handle local image uploads in Edit mode (immediate upload to server)
  const handleImmediateLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCinema) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingLogo(true);

    try {
      const res = await apiClient.post<any>(`/cinemas/${selectedCinema.cinemaId}/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Cập nhật Logo thành công.', 'success');
      const updated = res.data?.data ?? res.data;
      setForm(prev => ({ ...prev, logoUrl: updated.logoUrl }));
      fetchCinemas();
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi tải logo lên.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleImmediateBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCinema) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingBanner(true);

    try {
      const res = await apiClient.post<any>(`/cinemas/${selectedCinema.cinemaId}/upload-banner`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Cập nhật Banner thành công.', 'success');
      const updated = res.data?.data ?? res.data;
      setForm(prev => ({ ...prev, bannerUrl: updated.bannerUrl }));
      fetchCinemas();
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi tải banner lên.', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleImmediateGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedCinema) return;

    setUploadingGallery(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await apiClient.post<any>(`/cinemas/${selectedCinema.cinemaId}/upload-gallery`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const updated = res.data?.data ?? res.data;
        setForm(prev => ({ ...prev, galleryUrls: updated.galleryUrls }));
      }
      showToast('Thêm ảnh thư viện thành công.', 'success');
      fetchCinemas();
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi tải ảnh thư viện.', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  // Local File Selection for Previews (Create Mode)
  const handleLocalLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLocalBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleLocalGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const filesArr = Array.from(files);
    setGalleryFiles(prev => [...prev, ...filesArr]);
    const urls = filesArr.map(f => URL.createObjectURL(f));
    setGalleryPreviews(prev => [...prev, ...urls]);
  };

  // Remove local gallery file preview
  const removeLocalGalleryItem = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index]);
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Save Cinema
  const handleSaveCinema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cinemaName.trim()) {
      showToast('Vui lòng điền tên rạp chiếu.', 'warning');
      return;
    }
    if (!form.address.trim()) {
      showToast('Vui lòng điền địa chỉ chi tiết.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cinemaName: form.cinemaName,
        address: form.address,
        cityId: form.cityId,
        status: form.status,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        googleMapsUrl: form.googleMapsUrl,
        latitude: form.latitude ? parseFloat(form.latitude.toString()) : 0,
        longitude: form.longitude ? parseFloat(form.longitude.toString()) : 0,
        phone: form.phone,
        email: form.email,
        logoUrl: form.logoUrl,
        bannerUrl: form.bannerUrl,
        galleryUrls: form.galleryUrls
      };

      if (selectedCinema) {
        // Edit Mode Save (other fields are already updated, images uploaded immediately)
        await apiClient.put(`/cinemas/${selectedCinema.cinemaId}`, payload);
        showToast('Đã lưu thông tin rạp chiếu thành công.', 'success');
      } else {
        // Create Mode Save
        const res = await apiClient.post<any>('/cinemas', payload);
        const newCinema = res.data?.data ?? res.data;
        const newId = newCinema.cinemaId;

        // Upload files sequentially if selected
        if (logoFile) {
          const formData = new FormData();
          formData.append('file', logoFile);
          await apiClient.post(`/cinemas/${newId}/upload-logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        if (bannerFile) {
          const formData = new FormData();
          formData.append('file', bannerFile);
          await apiClient.post(`/cinemas/${newId}/upload-banner`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        if (galleryFiles.length > 0) {
          for (const f of galleryFiles) {
            const formData = new FormData();
            formData.append('file', f);
            await apiClient.post(`/cinemas/${newId}/upload-gallery`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          }
        }
        showToast('Tạo rạp chiếu mới và lưu ảnh thành công.', 'success');
      }

      setIsOpen(false);
      resetFilePreviews();
      fetchCinemas();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.Message || 'Lỗi xảy ra khi lưu rạp chiếu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Soft delete trigger
  const handleDeleteTrigger = (id: number) => {
    setCinemaToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!cinemaToDelete) return;
    try {
      await apiClient.delete(`/cinemas/${cinemaToDelete}`);
      showToast('Đã xóa rạp chiếu thành công.', 'success');
      setIsDeleteOpen(false);
      fetchCinemas();
    } catch (error: any) {
      console.error('Failed to delete cinema', error);
      const msg = error.response?.data?.Message || 'Không thể xóa rạp chiếu.';
      showToast(msg, 'error');
      setIsDeleteOpen(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCityFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('newest');
    setPage(1);
    showToast('Đã khôi phục bộ lọc mặc định.', 'info');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Gallery array helper
  const galleryArray = form.galleryUrls
    ? form.galleryUrls.split(',').filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-6 text-gray-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-col gap-1 text-left">
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Building size={22} className="text-[#e50914] drop-shadow-[0_0_8px_rgba(229,9,20,0.5)]" /> Hệ Thống Rạp Chiếu
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Quản lý chuỗi rạp chiếu phim, định vị Google Maps, thông tin liên lạc và cấu hình phòng chiếu
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 shadow-[0_0_15px_rgba(229,9,20,0.4)] text-xs font-black uppercase tracking-wider bg-[#e50914] hover:bg-[#b80710]"
        >
          <Plus size={14} /> Đăng Ký Rạp Mới
        </Button>
      </div>

      {/* Dashboard Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="bg-[#0e0e12]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-3.5 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 animate-pulse">
            <Building size={18} className="text-blue-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Tổng Rạp Chiếu</span>
            <span className="text-lg font-mono font-black text-white">{stats.totalCinemas} rạp</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#0e0e12]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-3.5 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Layers size={18} className="text-purple-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Phòng Chiếu</span>
            <span className="text-lg font-mono font-black text-white">{stats.totalHalls} phòng</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#0e0e12]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-3.5 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <Armchair size={18} className="text-yellow-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Tổng số ghế</span>
            <span className="text-lg font-black text-white">{stats.totalSeats.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#0e0e12]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-3.5 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Activity size={18} className="text-emerald-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Rạp Hoạt Động</span>
            <span className="text-lg font-mono font-black text-white">{stats.activeCinemas} rạp</span>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-[#0e0e12]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-3.5 shadow-xl backdrop-blur-md relative overflow-hidden group col-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-red-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Lịch Chiếu Hôm Nay</span>
            <span className="text-lg font-mono font-black text-white">{stats.todayShowtimes} suất</span>
          </div>
        </div>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-[#0e0e12]/40 p-4 border border-white/5 rounded-2xl backdrop-blur-md">
        
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-4">
          <Search size={14} className="absolute left-3 top-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên rạp hoặc địa chỉ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e12]/60 border border-white/5 focus:border-[#e50914] rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>

        {/* City Filter */}
        <div className="col-span-1 sm:col-span-2">
          <select
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)); setPage(1); }}
            className="w-full px-3 py-2.5 bg-[#0e0e12]/60 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-semibold cursor-pointer"
          >
            <option value="ALL" className="bg-[#121216]">Tất Cả Thành Phố</option>
            {cities.map(c => (
              <option key={c.cityId} value={c.cityId} className="bg-[#121216]">{c.cityName}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="col-span-1 sm:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2.5 bg-[#0e0e12]/60 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-semibold cursor-pointer"
          >
            <option value="ALL" className="bg-[#121216]">Tất Cả Trạng Thái</option>
            <option value="Active" className="bg-[#121216]">Hoạt Động</option>
            <option value="Maintenance" className="bg-[#121216]">Đang Bảo Trì</option>
            <option value="Inactive" className="bg-[#121216]">Tạm Ngưng</option>
          </select>
        </div>

        {/* Sorting */}
        <div className="col-span-1 sm:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="w-full px-3 py-2.5 bg-[#0e0e12]/60 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-semibold cursor-pointer"
          >
            <option value="newest" className="bg-[#121216]">Mới Nhất</option>
            <option value="oldest" className="bg-[#121216]">Cũ Nhất</option>
            <option value="mosthalls" className="bg-[#121216]">Nhiều Phòng Nhất</option>
            <option value="mostseats" className="bg-[#121216]">Nhiều Ghế Nhất</option>
          </select>
        </div>

        {/* Reset Buttons */}
        <div className="col-span-1 sm:col-span-2 flex justify-end">
          <button
            onClick={handleResetFilters}
            className="w-full flex items-center justify-center gap-1 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-gray-300 rounded-xl cursor-pointer transition-colors"
          >
            <RefreshCw size={12} /> Đặt Lại
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
              <th className="p-4 w-8"></th>
              <th className="p-4">Logo/Rạp</th>
              <th className="p-4">Tên Rạp Chiếu</th>
              <th className="p-4">Khu vực</th>
              <th className="p-4">Phòng</th>
              <th className="p-4">Số Ghế</th>
              <th className="p-4">Trạng Thái</th>
              <th className="p-4">Ngày Tạo</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse border-b border-white/5">
                  <td className="p-4"><div className="w-4 h-4 bg-white/5 rounded" /></td>
                  <td className="p-4"><div className="w-10 h-10 bg-white/5 rounded-full" /></td>
                  <td className="p-4">
                    <div className="h-4 bg-white/5 rounded w-40 mb-1" />
                    <div className="h-3 bg-white/5 rounded w-48" />
                  </td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-10" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="p-4"><div className="h-6 bg-white/5 rounded w-20" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                  <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : cinemas.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-gray-500 font-bold">
                  Không tìm thấy rạp chiếu nào khớp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              cinemas.map((cinema) => {
                const isExpanded = expandedCinemaId === cinema.cinemaId;
                return (
                  <React.Fragment key={cinema.cinemaId}>
                    
                    {/* Row main */}
                    <tr className={`hover:bg-white/[0.02] transition-colors ${isExpanded ? 'bg-white/[0.01]' : ''}`}>
                      
                      {/* Toggle Expand Icon */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleExpand(cinema.cinemaId)}
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>

                      {/* Logo avatar */}
                      <td className="p-4">
                        <div className="w-10 h-10 overflow-hidden rounded-xl border border-white/10 bg-[#121217] flex items-center justify-center shrink-0">
                          {cinema.logoUrl ? (
                            <img
                              src={getImageUrl(cinema.logoUrl)}
                              alt={cinema.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building size={16} className="text-gray-600" />
                          )}
                        </div>
                      </td>

                      {/* Name & Address */}
                      <td className="p-4">
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-white uppercase text-xs tracking-wide">{cinema.name}</span>
                          <span className="text-[10px] text-gray-500 font-sans mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {cinema.address}
                          </span>
                        </div>
                      </td>

                      {/* City */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-brand/10 border border-brand/20 text-brand text-[9px] font-black uppercase tracking-wider rounded-full">
                          {cinema.city}
                        </span>
                      </td>

                      {/* Halls Count */}
                      <td className="p-4 font-mono font-bold text-gray-300">
                        {cinema.hallCount} phòng
                      </td>

                      {/* Seats Count */}
                      <td className="p-4 font-mono font-bold text-gray-300">
                        {cinema.seatCount ? cinema.seatCount.toLocaleString() : 0} ghế
                      </td>

                      {/* Interactive Drodown Badge */}
                      <td className="p-4">
                        <select
                          value={cinema.status || 'Active'}
                          onChange={(e) => handleQuickStatusChange(cinema.cinemaId, e.target.value)}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-[#121216] border border-white/10 transition-colors focus:outline-none cursor-pointer ${
                            cinema.status === 'Active'
                              ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                              : cinema.status === 'Maintenance'
                              ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                              : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                          }`}
                        >
                          <option value="Active" className="bg-[#121216] text-emerald-400 font-bold">Hoạt Động</option>
                          <option value="Maintenance" className="bg-[#121216] text-amber-400 font-bold">Bảo Trì</option>
                          <option value="Inactive" className="bg-[#121216] text-rose-400 font-bold font-sans">Tạm Ngưng</option>
                        </select>
                      </td>

                      {/* Created date */}
                      <td className="p-4 font-sans text-gray-400 text-[10px]">
                        {cinema.createdAt ? dayjs(cinema.createdAt).format('DD/MM/YYYY') : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleOpenEdit(cinema)}
                            className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
                            title="Sửa thông tin rạp"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteTrigger(cinema.cinemaId)}
                            className="p-2 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer"
                            title="Xóa rạp"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable row content */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0 border-b border-white/5 bg-[#0a0a0d]/60">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="p-6 overflow-hidden flex flex-col md:flex-row gap-6"
                          >
                            
                            {/* Left Col: Halls List */}
                            <div className="w-full md:w-1/2 flex flex-col gap-4 text-left">
                              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-brand-gold flex items-center gap-1">
                                  <Layers size={14} /> Danh Sách Phòng Chiếu ({cinema.hallCount})
                                </h4>
                                <button
                                  onClick={() => handleOpenHallsManager(cinema)}
                                  className="text-[10px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <PlusCircle size={10} /> Cấu hình sảnh
                                </button>
                              </div>

                              {loadingExpandedHalls ? (
                                <div className="py-10 flex items-center justify-center">
                                  <Loader2 size={18} className="animate-spin text-brand-gold" />
                                </div>
                              ) : expandedHalls.length === 0 ? (
                                <span className="text-xs text-gray-500 py-6 text-center font-bold">Rạp chiếu chưa đăng ký phòng nào.</span>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                  {expandedHalls.map((hall) => (
                                    <div key={hall.hallId} className="bg-[#121217]/80 border border-white/5 p-3 rounded-xl flex flex-col gap-1 shadow-md">
                                      <div className="flex justify-between items-start">
                                        <span className="font-bold text-white uppercase text-xs">{hall.name}</span>
                                        <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase tracking-wider rounded">
                                          {hall.hallTypeName}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                        <Armchair size={10} className="text-gray-600" /> Sức chứa: {hall.capacity || 0} ghế
                                      </span>
                                      {hall.description && (
                                        <p className="text-[9px] text-gray-500 italic mt-1 font-semibold leading-normal truncate">{hall.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Right Col: Upcoming Showtimes */}
                            <div className="w-full md:w-1/2 flex flex-col gap-4 text-left border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                              <div className="border-b border-white/5 pb-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
                                  <Calendar size={14} /> Suất Chiếu Tiếp Theo
                                </h4>
                              </div>

                              {loadingExpandedShowtimes ? (
                                <div className="py-10 flex items-center justify-center">
                                  <Loader2 size={18} className="animate-spin text-blue-400" />
                                </div>
                              ) : expandedShowtimes.length === 0 ? (
                                <span className="text-xs text-gray-500 py-6 text-center font-bold">Chưa có lịch chiếu sắp tới.</span>
                              ) : (
                                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                                  {expandedShowtimes.map((st) => (
                                    <div key={st.showtimeId} className="bg-[#121217]/50 border border-white/5 p-2.5 rounded-xl flex justify-between items-center hover:bg-[#121217] transition-colors">
                                      <div className="flex flex-col text-left">
                                        <span className="font-bold text-white uppercase text-[11px] truncate max-w-xs">{st.movieTitle || st.movie?.title}</span>
                                        <span className="text-[9px] text-gray-500 font-bold block mt-0.5 uppercase tracking-wider">
                                          Sảnh: {st.hallName || st.hall?.hallName} • Giá vé: {st.priceValue?.toLocaleString()}đ
                                        </span>
                                      </div>
                                      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg text-right shrink-0">
                                        <span className="block font-mono text-[10px] font-black leading-none">{dayjs(parseApiDate(st.startTime)).format('HH:mm')}</span>
                                        <span className="block text-[8px] font-bold mt-0.5 uppercase tracking-wider">{dayjs(parseApiDate(st.startTime)).format('DD/MM/YYYY')}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
          <span>Đang hiển thị trang {page} trên {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="text-[10px]"
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="text-[10px]"
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* 1. CINEMA ADD / EDIT DIALOG */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-left my-8"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
                <Building size={16} className="text-[#e50914]" />
                {selectedCinema ? 'Cập Nhật Rạp Chiếu Phim' : 'Đăng Ký Rạp Chiếu Mới'}
              </h2>

              {/* Form Navigation Tabs */}
              <div className="flex border-b border-white/5 gap-2 mb-6">
                {[
                  { id: 'basic', label: 'Thông tin cơ bản', icon: <Building size={12} /> },
                  { id: 'location', label: 'Bản đồ & Vị trí', icon: <Map size={12} /> },
                  { id: 'images', label: 'Hình ảnh & Media', icon: <ImageIcon size={12} /> },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === t.id
                        ? 'border-[#e50914] text-[#e50914]'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSaveCinema} className="flex flex-col gap-4">
                
                {/* TAB 1: BASIC INFO */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                    <div className="sm:col-span-2">
                      <Input
                        type="text"
                        label="Tên Rạp Chiếu"
                        required
                        placeholder="Ví dụ: CGV Vincom Royal"
                        value={form.cinemaName}
                        onChange={(e) => setForm(prev => ({ ...prev, cinemaName: e.target.value }))}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        type="text"
                        label="Địa Chỉ Chi Tiết"
                        required
                        placeholder="Ví dụ: 72A Nguyễn Trãi, Thượng Đình, Thanh Xuân"
                        value={form.address}
                        onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-left">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Thành Phố / Tỉnh</span>
                      <select
                        value={form.cityId}
                        onChange={(e) => setForm(prev => ({ ...prev, cityId: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-3 bg-[#121216] border border-gray-800 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-semibold cursor-pointer"
                      >
                        {cities.map(c => (
                          <option key={c.cityId} value={c.cityId} className="bg-[#121216]">{c.cityName}</option>
                        ))}
                      </select>
                    </div>

                    <Input
                      type="text"
                      label="Số Điện Thoại Liên Hệ"
                      placeholder="Ví dụ: 1900 6017"
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    />

                    <div className="sm:col-span-2">
                      <Input
                        type="email"
                        label="Email Liên Hệ"
                        placeholder="Ví dụ: cgvroyal@cj.net"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-1.5 text-xs text-left">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Trạng Thái Hoạt Động</span>
                      <select
                        value={form.status}
                        onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-3 bg-[#121216] border border-gray-800 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-semibold cursor-pointer"
                      >
                        <option value="Active" className="bg-[#121216] text-emerald-400 font-bold">Active (Hoạt Động)</option>
                        <option value="Maintenance" className="bg-[#121216] text-amber-400 font-bold">Maintenance (Bảo Trì)</option>
                        <option value="Inactive" className="bg-[#121216] text-rose-400 font-bold">Inactive (Tạm Ngưng)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 2: LOCATION & MAP */}
                {activeTab === 'location' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                    <div className="sm:col-span-2">
                      <Input
                        type="url"
                        label="Đường dẫn Google Maps (URL)"
                        placeholder="Ví dụ: https://maps.app.goo.gl/..."
                        value={form.googleMapsUrl}
                        onChange={(e) => setForm(prev => ({ ...prev, googleMapsUrl: e.target.value }))}
                      />
                      {form.googleMapsUrl && (
                        <a
                          href={form.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 font-bold uppercase mt-1 flex items-center gap-1.5 hover:underline"
                        >
                          <ExternalLink size={10} /> Kiểm tra đường dẫn bản đồ
                        </a>
                      )}
                    </div>

                    <Input
                      type="number"
                      step="any"
                      label="Vĩ độ (Latitude)"
                      placeholder="Ví dụ: 10.762622"
                      value={form.latitude}
                      onChange={(e) => setForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    />

                    <Input
                      type="number"
                      step="any"
                      label="Kinh độ (Longitude)"
                      placeholder="Ví dụ: 106.660172"
                      value={form.longitude}
                      onChange={(e) => setForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                )}

                {/* TAB 4: IMAGES & UPLOADS */}
                {activeTab === 'images' && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    
                    {/* Logo Section */}
                    <div className="bg-[#121217] p-4 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl border border-white/10 overflow-hidden bg-black flex items-center justify-center shrink-0">
                          {selectedCinema ? (
                            form.logoUrl ? (
                              <img src={getImageUrl(form.logoUrl)} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building size={20} className="text-gray-600" />
                            )
                          ) : logoPreview ? (
                            <img src={logoPreview} alt="Preview Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Building size={20} className="text-gray-600" />
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Logo Rạp Chiếu</span>
                          <span className="text-[10px] text-gray-500 font-semibold mt-0.5">Kích thước khuyên dùng: vuông (512x512)</span>
                        </div>
                      </div>
                      <div>
                        {selectedCinema ? (
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                            {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                            <span>Thay đổi logo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImmediateLogoUpload}
                              disabled={uploadingLogo}
                            />
                          </label>
                        ) : (
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                            <Upload size={12} />
                            <span>{logoFile ? 'Chọn ảnh khác' : 'Tải Logo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLocalLogoChange}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Banner Section */}
                    <div className="bg-[#121217] p-4 border border-white/5 rounded-2xl flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Ảnh Banner Rạp</span>
                          <span className="text-[10px] text-gray-500 font-semibold mt-0.5">Hiển thị ở trang chi tiết rạp chiếu (tỉ lệ 16:9 hoặc siêu rộng)</span>
                        </div>
                        {selectedCinema ? (
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                            {uploadingBanner ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                            <span>Thay đổi Banner</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImmediateBannerUpload}
                              disabled={uploadingBanner}
                            />
                          </label>
                        ) : (
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                            <Upload size={12} />
                            <span>{bannerFile ? 'Chọn banner khác' : 'Tải Banner'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLocalBannerChange}
                            />
                          </label>
                        )}
                      </div>
                      
                      <div className="w-full h-36 border border-white/5 rounded-xl overflow-hidden bg-black flex items-center justify-center relative">
                        {selectedCinema ? (
                          form.bannerUrl ? (
                            <img src={getImageUrl(form.bannerUrl)} alt="Banner" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Chưa có ảnh banner</span>
                          )
                        ) : bannerPreview ? (
                          <img src={bannerPreview} alt="Preview Banner" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Chưa tải ảnh banner lên</span>
                        )}
                      </div>
                    </div>

                    {/* Gallery Section */}
                    <div className="bg-[#121217] p-4 border border-white/5 rounded-2xl flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Thư Viện Ảnh Rạp</span>
                          <span className="text-[10px] text-gray-500 font-semibold mt-0.5">Ảnh không gian rạp, dịch vụ bắp nước, ghế ngồi...</span>
                        </div>
                        {selectedCinema ? (
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                            {uploadingGallery ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            <span>Thêm ảnh</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={handleImmediateGalleryUpload}
                              disabled={uploadingGallery}
                            />
                          </label>
                        ) : (
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                            <Plus size={12} />
                            <span>Thêm ảnh</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={handleLocalGalleryChange}
                            />
                          </label>
                        )}
                      </div>

                      {/* Thumbnails Display */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {selectedCinema ? (
                          galleryArray.length === 0 ? (
                            <span className="text-[10px] text-gray-500 italic col-span-full">Thư viện ảnh trống.</span>
                          ) : (
                            galleryArray.map((url, idx) => (
                              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-black">
                                <img src={getImageUrl(url)} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                {/* Option to remove could be added if needed, or simply append */}
                              </div>
                            ))
                          )
                        ) : galleryPreviews.length === 0 ? (
                          <span className="text-[10px] text-gray-500 italic col-span-full">Chưa chọn ảnh thư viện.</span>
                        ) : (
                          galleryPreviews.map((url, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-black">
                              <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeLocalGalleryItem(idx)}
                                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* Actions Form */}
                <div className="flex gap-4 mt-6 border-t border-white/5 pt-4">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" fullWidth className="shadow-brand bg-[#e50914] hover:bg-[#b80710] font-black" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu Rạp Chiếu'}
                  </Button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. MANAGE HALLS MODAL / DRAWER */}
      <AnimatePresence>
        {isHallsOpen && selectedCinemaForHalls && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-left my-8"
            >
              <button
                onClick={() => setIsHallsOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-3 flex items-center gap-2">
                <Layers size={16} className="text-brand-gold" />
                <span>Phòng Chiếu Của {selectedCinemaForHalls.name}</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left side: Create/Edit Form */}
                <div className="md:col-span-5 bg-white/[0.01] p-4 border border-white/5 rounded-2xl flex flex-col gap-4 text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-gold">
                    {isEditingHall ? 'Cập Nhật Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}
                  </h3>

                  <form onSubmit={handleSaveHall} className="flex flex-col gap-4">
                    <Input
                      type="text"
                      label="Tên Phòng Chiếu"
                      required
                      placeholder="Ví dụ: Phòng chiếu 1, IMAX 3"
                      value={hallForm.hallName}
                      onChange={(e) => setHallForm(prev => ({ ...prev, hallName: e.target.value }))}
                    />

                    <div className="flex flex-col gap-1.5 text-xs text-left">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Loại Phòng</span>
                      <select
                        value={hallForm.hallTypeId}
                        onChange={(e) => setHallForm(prev => ({ ...prev, hallTypeId: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2.5 bg-[#121216] border border-gray-800 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand transition-colors font-semibold cursor-pointer"
                      >
                        {hallTypes.map(t => (
                          <option key={t.hallTypeId} value={t.hallTypeId} className="bg-[#121216]">{t.typeName}</option>
                        ))}
                      </select>
                    </div>

                    <Input
                      type="number"
                      label="Sức Chứa (Số Ghế)"
                      required
                      min={10}
                      max={300}
                      value={hallForm.capacity}
                      onChange={(e) => setHallForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                    />

                    <div className="flex flex-col gap-1.5 text-xs text-left">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Mô Tả</span>
                      <textarea
                        rows={3}
                        placeholder="Mô tả sảnh chiếu..."
                        value={hallForm.description}
                        onChange={(e) => setHallForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#121216] border border-gray-800 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand transition-colors font-semibold"
                      />
                    </div>

                    <div className="flex gap-2.5 mt-2">
                      {isEditingHall && (
                        <Button
                          type="button"
                          variant="secondary"
                          fullWidth
                          size="sm"
                          onClick={() => {
                            setIsEditingHall(false);
                            setSelectedHall(null);
                            setHallForm({
                              hallName: '',
                              hallTypeId: hallTypes[0]?.hallTypeId || 1,
                              capacity: 100,
                              description: '',
                            });
                          }}
                        >
                          Hủy
                        </Button>
                      )}
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        size="sm"
                        className="shadow-brand font-black"
                        disabled={savingHall}
                      >
                        {savingHall ? <Loader2 size={14} className="animate-spin mx-auto" /> : isEditingHall ? 'Cập Nhật' : 'Lưu Sảnh'}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Right side: Halls List */}
                <div className="md:col-span-7 flex flex-col gap-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2 text-left">
                    Danh Sách Phòng Hiện Có ({hallsList.length})
                  </h3>

                  {loadingHalls ? (
                    <div className="py-20 flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-brand-gold" />
                    </div>
                  ) : hallsList.length === 0 ? (
                    <span className="text-xs text-gray-500 text-center py-10 font-bold">Không có phòng nào trong rạp này.</span>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {hallsList.map((hall) => (
                        <div key={hall.hallId} className="bg-[#121217]/50 border border-white/5 p-3 rounded-xl flex justify-between items-center hover:bg-[#121217]/80 transition-colors">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-white uppercase text-xs">{hall.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                              Loại: <span className="text-brand-gold font-bold">{hall.hallTypeName}</span> • Sức chứa: {hall.capacity || 0} ghế
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditHallClick(hall)}
                              className="p-1.5 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
                              title="Sửa phòng chiếu"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteHall(hall.hallId)}
                              className="p-1.5 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer"
                              title="Xóa phòng"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121217] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center flex flex-col gap-4 items-center"
            >
              <div className="h-12 w-12 bg-[#e50914]/10 border border-[#e50914]/20 text-[#e50914] rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Xác Nhận Xóa Rạp Chiếu</h3>
                <p className="text-xs text-gray-400 mt-2 font-semibold leading-relaxed">
                  Bạn có chắc chắn muốn ngừng hoạt động rạp chiếu này? Hệ thống sẽ ngăn chặn việc xóa nếu rạp còn phòng chiếu hoạt động hoặc lịch chiếu phim hiện hành.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)}>
                  Giữ Lại
                </Button>
                <Button variant="primary" fullWidth onClick={handleDelete} className="bg-[#e50914] hover:bg-[#b80710] font-black">
                  Xóa Rạp
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
