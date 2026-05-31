import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Plus, Search, Edit3, Trash2, X, AlertTriangle, Loader2, Upload, MapPin } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import type { Cinema } from '../../types';

export const CinemasManagement: React.FC = () => {
  const { showToast } = useToast();
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(false);

  // Search and Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 5;

  // Mock cities
  const cities = [
    { cityId: 1, cityName: 'Hồ Chí Minh' },
    { cityId: 2, cityName: 'Hà Nội' },
    { cityId: 3, cityName: 'Đà Nẵng' },
    { cityId: 4, cityName: 'Nha Trang' },
  ];

  // CRUD states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [cinemaToDelete, setCinemaToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Image Uploading state
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    cinemaName: '',
    address: '',
    cityId: 1,
  });

  const fetchCinemas = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/cinemas', {
        params: {
          Search: search || undefined,
          PageNumber: page,
          PageSize: pageSize,
        },
      });
      // Adapt response schema mapping to matches client Cinema entity
      const responseData = response.data?.data ?? response.data;
      const cinemaItems = responseData?.items ?? (Array.isArray(responseData) ? responseData : []);
      
      const mapped = cinemaItems.map((item: any) => ({
        cinemaId: item.cinemaId,
        name: item.cinemaName,
        address: item.address,
        city: item.cityName || (item.cityId === 1 ? 'Hồ Chí Minh' : 'Hà Nội'),
        imageUrl: item.imageUrl,
        cityId: item.cityId
      }));
      setCinemas(mapped);
      setTotalCount(responseData?.totalCount ?? 0);
    } catch (error) {
      console.error('Failed to fetch cinemas', error);
      showToast('Không thể tải danh sách rạp chiếu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCinemas();
  }, [search, page]);

  const handleOpenAdd = () => {
    setSelectedCinema(null);
    setForm({
      cinemaName: '',
      address: '',
      cityId: 1,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (cinema: any) => {
    setSelectedCinema(cinema);
    setForm({
      cinemaName: cinema.name,
      address: cinema.address,
      cityId: cinema.cityId || 1,
    });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedCinema) {
        // Edit Mode
        await apiClient.put(`/cinemas/${selectedCinema.cinemaId}`, form);
        showToast('Đã cập nhật thông tin rạp chiếu.', 'success');
      } else {
        // Create Mode
        await apiClient.post('/cinemas', form);
        showToast('Đã đăng ký rạp chiếu mới.', 'success');
      }
      setIsOpen(false);
      fetchCinemas();
    } catch (error: any) {
      console.error('Failed to save cinema', error);
      showToast(error.response?.data?.Message || 'Lỗi khi lưu thông tin rạp chiếu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrigger = (id: number) => {
    setCinemaToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!cinemaToDelete) return;
    try {
      await apiClient.delete(`/cinemas/${cinemaToDelete}`);
      showToast('Đã xóa rạp chiếu khỏi hệ thống.', 'success');
      setIsDeleteOpen(false);
      fetchCinemas();
    } catch (error) {
      console.error('Failed to delete cinema', error);
      showToast('Lỗi khi xóa rạp chiếu.', 'error');
    }
  };

  const handleImageUpload = async (cinemaId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingId(cinemaId);

    try {
      await apiClient.post(`/cinemas/${cinemaId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showToast('Ảnh mặt tiền rạp chiếu đã được cập nhật thành công.', 'success');
      fetchCinemas();
    } catch (error) {
      console.error('Failed to upload image', error);
      showToast('Lỗi tải ảnh lên máy chủ.', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Building size={20} className="text-brand" /> Hệ Thống Rạp Chiếu
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Quản lý chuỗi rạp chiếu phim, khu vực địa lý, ảnh banner và các phòng chiếu
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenAdd} className="flex items-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider">
          <Plus size={14} /> Thêm Rạp
        </Button>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên rạp hoặc địa chỉ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e12]/60 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
              <th className="p-4">Ảnh Rạp</th>
              <th className="p-4">Tên Rạp</th>
              <th className="p-4">Thành Phố</th>
              <th className="p-4">Địa Chỉ</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-4"><div className="w-16 h-10 bg-white/5 rounded-lg" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                  <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : cinemas.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-500 font-bold">
                  Không tìm thấy rạp chiếu nào được đăng ký.
                </td>
              </tr>
            ) : (
              cinemas.map((cinema) => (
                <tr key={cinema.cinemaId} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4">
                    <div className="relative group/image w-16 h-10 overflow-hidden rounded-lg border border-white/10 bg-[#121217]">
                      {cinema.imageUrl ? (
                        <img
                          src={cinema.imageUrl}
                          alt={cinema.name}
                          className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 bg-white/5">
                          <Building size={14} />
                        </div>
                      )}
                      
                      {/* Image Upload Hover Overlay */}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        {uploadingId === cinema.cinemaId ? (
                          <Loader2 size={12} className="animate-spin text-white" />
                        ) : (
                          <Upload size={12} className="text-white" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(cinema.cinemaId, e)}
                          disabled={uploadingId !== null}
                        />
                      </label>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-white uppercase">{cinema.name}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 bg-brand/10 border border-brand/25 text-brand text-[9px] font-black uppercase tracking-wider rounded-full">
                      {cinema.city}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 font-sans flex items-center gap-1.5 mt-2.5">
                    <MapPin size={12} className="text-gray-600 shrink-0" />
                    <span>{cinema.address}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEdit(cinema)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
                        title="Sửa thông tin"
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
              ))
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

      {/* ADD/EDIT MODAL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-left"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-3">
                {selectedCinema ? 'Sửa Thông Tin Rạp' : 'Thêm Rạp Chiếu Mới'}
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Input
                  type="text"
                  label="Tên Rạp Chiếu"
                  required
                  placeholder="Ví dụ: CGV Vincom Royal"
                  value={form.cinemaName}
                  onChange={(e) => setForm(prev => ({ ...prev, cinemaName: e.target.value }))}
                />

                <Input
                  type="text"
                  label="Địa Chỉ Chi Tiết"
                  required
                  placeholder="Ví dụ: 72A Nguyễn Trãi, Thanh Xuân"
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                />

                <div className="flex flex-col gap-1.5 text-xs text-left">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">Thành Phố</span>
                  <select
                    value={form.cityId}
                    onChange={(e) => setForm(prev => ({ ...prev, cityId: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand transition-colors font-semibold"
                  >
                    {cities.map(c => (
                      <option key={c.cityId} value={c.cityId} className="bg-[#121216]">{c.cityName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 mt-4">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" fullWidth className="shadow-brand font-black" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu Thông Tin'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121217] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center flex flex-col gap-4 items-center"
            >
              <div className="h-12 w-12 bg-brand/10 border border-brand/20 text-brand rounded-full flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Xác Nhận Xóa</h3>
                <p className="text-xs text-gray-400 mt-2 font-semibold">
                  Bạn có chắc chắn muốn xóa rạp chiếu này? Hành động này sẽ xóa tất cả phòng chiếu và lịch chiếu liên quan.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)}>
                  Giữ Lại
                </Button>
                <Button variant="primary" fullWidth onClick={handleDelete} className="bg-brand hover:bg-brand/90 font-black">
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
