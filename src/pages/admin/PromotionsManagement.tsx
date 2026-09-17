import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Percent, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  AlertTriangle, 
  Loader2, 
  Calendar, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Zap
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';

interface PromotionCondition {
  promotionConditionId?: number;
  applyType: 'All' | 'Movie' | 'Showtime' | 'GoldenHour' | 'MemberLevel';
  movieId?: number | null;
  movieTitle?: string | null;
  showtimeId?: number | null;
  memberLevelId?: number | null;
  memberLevelName?: string | null;
  startHour?: string | null; // e.g. "09:00:00"
  endHour?: string | null; // e.g. "22:00:00"
  daysOfWeek?: string | null; // e.g. "Monday,Tuesday"
}

interface Promotion {
  promotionId: number;
  promoCode: string;
  name: string;
  description?: string;
  discountValue: number;
  discountType: 'Percentage' | 'FixedAmount';
  maxDiscountAmount?: number | null;
  minimumOrderValue?: number | null;
  startDate: string;
  endDate: string;
  maxUsage: number;
  currentUsage: number;
  isAutoApply: boolean;
  isActive: boolean;
  createdAt: string;
  promotionConditions: PromotionCondition[];
}

interface Movie {
  id: number;
  title: string;
}

interface MemberTier {
  memberTierId: number;
  tierName: string;
  benefitsDescription?: string;
}

export const PromotionsManagement: React.FC = () => {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [memberTiers, setMemberTiers] = useState<MemberTier[]>([]);
  const [loading, setLoading] = useState(false);

  // Search and filters
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 8;

  // CRUD states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    promoCode: '',
    name: '',
    description: '',
    discountType: 'Percentage' as 'Percentage' | 'FixedAmount',
    discountValue: 10,
    maxDiscountAmount: '' as string | number,
    minimumOrderValue: '' as string | number,
    startDate: '',
    endDate: '',
    maxUsage: 100,
    isAutoApply: false,
    isActive: true,
  });

  const [conditions, setConditions] = useState<Array<PromotionCondition & { tempId: string }>>([]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/promotions', {
        params: {
          Search: search || undefined,
          IsActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
          DiscountType: discountTypeFilter || undefined,
          PageNumber: page,
          PageSize: pageSize,
        },
      });
      const data = response.data?.data ?? response.data;
      setPromotions(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(data?.totalCount ?? 0);
    } catch (error) {
      console.error('Failed to fetch promotions', error);
      showToast('Không thể tải danh sách khuyến mãi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      // Fetch movies
      const moviesRes = await apiClient.get<any>('/movies', { params: { PageSize: 100 } });
      const mData = moviesRes.data?.data?.items ?? moviesRes.data?.items ?? moviesRes.data ?? [];
      setMovies(Array.isArray(mData) ? mData.map((m: any) => ({ id: m.id ?? m.movieId, title: m.title })) : []);

      // Fetch member tiers
      const tiersRes = await apiClient.get<MemberTier[]>('/users/member-tiers');
      setMemberTiers(Array.isArray(tiersRes.data) ? tiersRes.data : []);
    } catch (error) {
      console.error('Failed to load reference data', error);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [search, activeFilter, discountTypeFilter, page]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const handleOpenAdd = () => {
    setSelectedPromo(null);
    setForm({
      promoCode: '',
      name: '',
      description: '',
      discountType: 'Percentage',
      discountValue: 10,
      maxDiscountAmount: '',
      minimumOrderValue: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      maxUsage: 100,
      isAutoApply: false,
      isActive: true,
    });
    setConditions([]);
    setIsOpen(true);
  };

  const handleOpenEdit = (promo: Promotion) => {
    setSelectedPromo(promo);
    setForm({
      promoCode: promo.promoCode,
      name: promo.name,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxDiscountAmount: promo.maxDiscountAmount ?? '',
      minimumOrderValue: promo.minimumOrderValue ?? '',
      startDate: promo.startDate.split('T')[0],
      endDate: promo.endDate.split('T')[0],
      maxUsage: promo.maxUsage,
      isAutoApply: promo.isAutoApply,
      isActive: promo.isActive,
    });

    const mappedConditions = (promo.promotionConditions || []).map((c, index) => ({
      ...c,
      tempId: `cond_${index}_${Date.now()}`,
    }));
    setConditions(mappedConditions);
    setIsOpen(true);
  };

  const handleToggleStatus = async (id: number) => {
    setTogglingId(id);
    try {
      await apiClient.patch(`/promotions/${id}/toggle-status`);
      showToast('Đã thay đổi trạng thái hoạt động của khuyến mãi.', 'success');
      fetchPromotions();
    } catch (error: any) {
      console.error('Failed to toggle status', error);
      showToast(error.response?.data?.Message || 'Lỗi khi cập nhật trạng thái.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddCondition = () => {
    setConditions(prev => [
      ...prev,
      {
        tempId: `cond_${Date.now()}_${Math.random()}`,
        applyType: 'Movie',
        movieId: movies[0]?.id || null,
        showtimeId: null,
        memberLevelId: memberTiers[0]?.memberTierId || null,
        startHour: '09:00:00',
        endHour: '22:00:00',
        daysOfWeek: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'
      }
    ]);
  };

  const handleRemoveCondition = (tempId: string) => {
    setConditions(prev => prev.filter(c => c.tempId !== tempId));
  };

  const handleConditionChange = (tempId: string, field: keyof PromotionCondition, value: any) => {
    setConditions(prev => prev.map(c => {
      if (c.tempId === tempId) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        promoCode: form.promoCode.toUpperCase().trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: form.discountValue,
        maxDiscountAmount: form.maxDiscountAmount !== '' ? parseFloat(form.maxDiscountAmount.toString()) : null,
        minimumOrderValue: form.minimumOrderValue !== '' ? parseFloat(form.minimumOrderValue.toString()) : null,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        maxUsage: form.maxUsage,
        isAutoApply: form.isAutoApply,
        isActive: form.isActive,
        promotionConditions: conditions.map(c => ({
          applyType: c.applyType,
          movieId: c.applyType === 'Movie' ? c.movieId : null,
          showtimeId: c.applyType === 'Showtime' ? c.showtimeId : null,
          memberLevelId: c.applyType === 'MemberLevel' ? c.memberLevelId : null,
          startHour: c.applyType === 'GoldenHour' ? (c.startHour?.includes(':') && c.startHour.split(':').length === 2 ? `${c.startHour}:00` : c.startHour) : null,
          endHour: c.applyType === 'GoldenHour' ? (c.endHour?.includes(':') && c.endHour.split(':').length === 2 ? `${c.endHour}:00` : c.endHour) : null,
          daysOfWeek: c.applyType === 'GoldenHour' ? c.daysOfWeek : null,
        }))
      };

      if (selectedPromo) {
        await apiClient.put(`/promotions/${selectedPromo.promotionId}`, payload);
        showToast('Đã cập nhật mã khuyến mãi.', 'success');
      } else {
        await apiClient.post('/promotions', payload);
        showToast('Đã tạo mã khuyến mãi mới.', 'success');
      }
      setIsOpen(false);
      fetchPromotions();
    } catch (error: any) {
      console.error('Failed to save promotion', error);
      showToast(error.response?.data?.Message || 'Lỗi khi lưu mã khuyến mãi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrigger = (id: number) => {
    setPromoToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!promoToDelete) return;
    try {
      await apiClient.delete(`/promotions/${promoToDelete}`);
      showToast('Đã xóa mềm mã khuyến mãi.', 'success');
      setIsDeleteOpen(false);
      fetchPromotions();
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi xóa mã khuyến mãi.', 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Day list mapping for UI
  const daysListOptions = [
    { label: 'T.Hai', value: 'Monday' },
    { label: 'T.Ba', value: 'Tuesday' },
    { label: 'T.Tư', value: 'Wednesday' },
    { label: 'T.Năm', value: 'Thursday' },
    { label: 'T.Sáu', value: 'Friday' },
    { label: 'T.Bảy', value: 'Saturday' },
    { label: 'C.Nhật', value: 'Sunday' }
  ];

  return (
    <div className="flex flex-col gap-6 text-left select-none pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
            <Percent size={24} className="text-brand animate-pulse" /> Quản Lý Khuyến Mãi
          </h2>
          <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block mt-1">
            Thiết lập chương trình giảm giá tự động, giờ vàng, điều kiện áp dụng và xếp hạng thành viên chuyên nghiệp
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenAdd} className="flex items-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider py-2.5 rounded-xl">
          <Plus size={14} /> Thêm Khuyến Mãi
        </Button>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-semibold">
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-3.5 top-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hoặc tên chiến dịch..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 bg-[#0e0e12]/60 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-500 shrink-0" />
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-3 bg-[#0e0e12]/60 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-brand transition-all font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Tất Cả Trạng Thái</option>
            <option value="true" className="bg-[#121217]">Đang Hoạt Động</option>
            <option value="false" className="bg-[#121217]">Đã Vô Hiệu</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Percent size={14} className="text-gray-500 shrink-0" />
          <select
            value={discountTypeFilter}
            onChange={(e) => { setDiscountTypeFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-3 bg-[#0e0e12]/60 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-brand transition-all font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Tất Cả Loại Giảm</option>
            <option value="Percentage" className="bg-[#121217]">Phần Trăm (%)</option>
            <option value="FixedAmount" className="bg-[#121217]">Số Tiền Cố Định</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
              <th className="p-4">Mã / Tên Khuyến Mãi</th>
              <th className="p-4">Chi Tiết Giảm Giá</th>
              <th className="p-4">Giá Trị Tối Thiểu</th>
              <th className="p-4">Giới Hạn / Đã Dùng</th>
              <th className="p-4 text-center">Tự Động</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-48" /><div className="h-3 bg-white/5 rounded w-32 mt-1.5" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                  <td className="p-4 text-center"><div className="h-4 bg-white/5 rounded w-6 mx-auto" /></td>
                  <td className="p-4 text-center"><div className="h-4 bg-white/5 rounded w-14 mx-auto" /></td>
                  <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500 font-bold">
                  Không tìm thấy chương trình khuyến mãi nào.
                </td>
              </tr>
            ) : (
              promotions.map((promo) => (
                <tr key={promo.promotionId} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-white font-mono uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5 mr-2">{promo.promoCode}</span>
                    <span className="font-bold text-white text-[12px] block mt-1.5">{promo.name}</span>
                    {promo.description && <span className="block text-[10px] text-gray-500 font-normal mt-0.5 max-w-xs truncate">{promo.description}</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-green-400 text-[12px]">
                        {promo.discountType === 'Percentage' 
                          ? `Giảm ${promo.discountValue}%` 
                          : `Giảm ${promo.discountValue.toLocaleString()}đ`
                        }
                      </span>
                      {promo.discountType === 'Percentage' && promo.maxDiscountAmount && (
                        <span className="text-[10px] text-gray-500 mt-0.5">Tối đa: {promo.maxDiscountAmount.toLocaleString()}đ</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-400">
                      {promo.minimumOrderValue ? `${promo.minimumOrderValue.toLocaleString()}đ` : 'Không có'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 max-w-[120px]">
                      <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase">
                        <span>Đã dùng</span>
                        <span>{promo.currentUsage} / {promo.maxUsage}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand rounded-full transition-all" 
                          style={{ width: `${Math.min((promo.currentUsage / promo.maxUsage) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {promo.isAutoApply ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-brand/10 border border-brand/20 text-brand px-1.5 py-0.5 rounded" title="Áp dụng tự động">
                        <Zap size={10} className="fill-brand" /> Auto
                      </span>
                    ) : (
                      <span className="text-gray-600 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(promo.promotionId)}
                      disabled={togglingId === promo.promotionId}
                      className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title={promo.isActive ? 'Bấm để Vô hiệu' : 'Bấm để Kích hoạt'}
                    >
                      {togglingId === promo.promotionId ? (
                        <Loader2 size={16} className="animate-spin text-brand mx-auto" />
                      ) : promo.isActive ? (
                        <span className="flex items-center gap-1 text-green-400 font-extrabold text-[10px] uppercase">
                          <ToggleRight size={22} className="text-green-500" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 font-extrabold text-[10px] uppercase">
                          <ToggleLeft size={22} className="text-gray-600" />
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEdit(promo)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
                        title="Sửa thông tin"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(promo.promotionId)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer"
                        title="Xóa"
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
                <Sparkles size={16} className="text-brand" /> {selectedPromo ? 'Sửa Chương Trình Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'}
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-2">
                
                {/* 1. THÔNG TIN CƠ BẢN */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-black text-brand uppercase tracking-wider border-l-2 border-brand pl-2">
                    1. Thông tin cơ bản
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="Mã Giảm Giá (Voucher Code)"
                      required
                      placeholder="Ví dụ: GIAMGIA30K, GOLDENHOUR"
                      value={form.promoCode}
                      onChange={(e) => setForm(prev => ({ ...prev, promoCode: e.target.value }))}
                    />

                    <Input
                      type="text"
                      label="Tên Chương Trình"
                      required
                      placeholder="Ví dụ: Khuyến mãi Thứ Hai vui vẻ"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Mô Tả Chi Tiết</span>
                    <textarea
                      placeholder="Nhập mô tả chương trình khuyến mãi để khách hàng biết thể lệ..."
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Ngày bắt đầu hiệu lực"
                      required
                      value={form.startDate}
                      onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    <Input
                      type="date"
                      label="Ngày hết hạn"
                      required
                      value={form.endDate}
                      onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 2. CẤU HÌNH GIẢM GIÁ */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-black text-brand uppercase tracking-wider border-l-2 border-brand pl-2">
                    2. Cấu hình giảm giá
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Loại Giảm Giá</span>
                      <select
                        value={form.discountType}
                        onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value as any }))}
                        className="w-full px-3 py-2.5 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold cursor-pointer"
                      >
                        <option value="Percentage" className="bg-[#121216]">Phần trăm (%)</option>
                        <option value="FixedAmount" className="bg-[#121216]">Số tiền cố định (đ)</option>
                      </select>
                    </div>

                    <Input
                      type="number"
                      label={form.discountType === 'Percentage' ? 'Tỷ lệ giảm (%)' : 'Số tiền giảm (đ)'}
                      required
                      value={form.discountValue}
                      onChange={(e) => setForm(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      label="Giảm tối đa (đ) - Bỏ trống nếu không hạn chế"
                      disabled={form.discountType !== 'Percentage'}
                      placeholder="Ví dụ: 50000"
                      value={form.maxDiscountAmount}
                      onChange={(e) => setForm(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                    />

                    <Input
                      type="number"
                      label="Giá trị đơn hàng tối thiểu (đ)"
                      placeholder="Ví dụ: 150000"
                      value={form.minimumOrderValue}
                      onChange={(e) => setForm(prev => ({ ...prev, minimumOrderValue: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      label="Giới hạn tổng số lượt dùng"
                      required
                      value={form.maxUsage}
                      onChange={(e) => setForm(prev => ({ ...prev, maxUsage: parseInt(e.target.value) || 0 }))}
                    />

                    <div className="flex gap-6 items-center justify-start pl-2">
                      <label className="flex items-center gap-2 text-white font-bold select-none cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={form.isAutoApply}
                          onChange={(e) => setForm(prev => ({ ...prev, isAutoApply: e.target.checked }))}
                          className="rounded bg-[#121216] border-white/10 text-brand focus:ring-0 cursor-pointer"
                        />
                        Áp dụng tự động (Auto Apply)
                      </label>

                      <label className="flex items-center gap-2 text-white font-bold select-none cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded bg-[#121216] border-white/10 text-brand focus:ring-0 cursor-pointer"
                        />
                        Kích hoạt chương trình
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. ĐIỀU KIỆN ÁP DỤNG */}
                <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-brand uppercase tracking-wider border-l-2 border-brand pl-2">
                      3. Thiết lập điều kiện áp dụng
                    </h3>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddCondition}
                      className="text-[10px] font-bold py-1 px-2.5 bg-white/5 border border-white/10 hover:border-brand rounded-lg flex items-center gap-1"
                    >
                      <Plus size={12} /> Thêm điều kiện
                    </Button>
                  </div>

                  {conditions.length === 0 ? (
                    <div className="bg-[#121216] border border-dashed border-white/5 rounded-2xl p-6 text-center text-gray-500 font-semibold text-xs">
                      Không có điều kiện ràng buộc. Khuyến mãi sẽ áp dụng cho tất cả các giao dịch.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {conditions.map((cond) => (
                        <div 
                          key={cond.tempId} 
                          className="p-4 bg-[#121216] border border-white/5 rounded-2xl flex flex-col gap-4 relative group"
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveCondition(cond.tempId)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-brand transition-colors p-1"
                            title="Xóa điều kiện"
                          >
                            <X size={14} />
                          </button>

                          <div className="grid grid-cols-2 gap-4 mr-6">
                            <div className="flex flex-col gap-1.5 text-xs">
                              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Loại điều kiện</span>
                              <select
                                value={cond.applyType}
                                onChange={(e) => handleConditionChange(cond.tempId, 'applyType', e.target.value)}
                                className="w-full px-3 py-2 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold cursor-pointer"
                              >
                                <option value="Movie">Áp dụng cho Phim cụ thể</option>
                                <option value="MemberLevel">Theo Hạng Thành Viên</option>
                                <option value="GoldenHour">Giờ Vàng / Ngày đặc biệt</option>
                                <option value="Showtime">Suất Chiếu cụ thể (ID)</option>
                              </select>
                            </div>

                            {/* DYNAMIC FORM ACCORDING TO APPLYTYPE */}
                            {cond.applyType === 'Movie' && (
                              <div className="flex flex-col gap-1.5 text-xs">
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Chọn Phim</span>
                                <select
                                  value={cond.movieId || ''}
                                  onChange={(e) => handleConditionChange(cond.tempId, 'movieId', parseInt(e.target.value) || null)}
                                  className="w-full px-3 py-2 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold cursor-pointer"
                                >
                                  <option value="">-- Chọn Phim --</option>
                                  {movies.map(m => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {cond.applyType === 'MemberLevel' && (
                              <div className="flex flex-col gap-1.5 text-xs">
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Chọn hạng thành viên tối thiểu</span>
                                <select
                                  value={cond.memberLevelId || ''}
                                  onChange={(e) => handleConditionChange(cond.tempId, 'memberLevelId', parseInt(e.target.value) || null)}
                                  className="w-full px-3 py-2 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold cursor-pointer"
                                >
                                  <option value="">-- Chọn Hạng --</option>
                                  {memberTiers.map(tier => (
                                    <option key={tier.memberTierId} value={tier.memberTierId}>{tier.tierName}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {cond.applyType === 'Showtime' && (
                              <div className="flex flex-col gap-1.5 text-xs">
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Mã Suất Chiếu (Showtime ID)</span>
                                <input
                                  type="number"
                                  placeholder="Ví dụ: 124"
                                  value={cond.showtimeId || ''}
                                  onChange={(e) => handleConditionChange(cond.tempId, 'showtimeId', parseInt(e.target.value) || null)}
                                  className="w-full px-3 py-2 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                                />
                              </div>
                            )}

                            {cond.applyType === 'GoldenHour' && (
                              <div className="flex gap-2">
                                <div className="flex flex-col gap-1.5 text-xs w-1/2">
                                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Từ giờ</span>
                                  <input
                                    type="time"
                                    value={cond.startHour?.substring(0, 5) || '09:00'}
                                    onChange={(e) => handleConditionChange(cond.tempId, 'startHour', `${e.target.value}:00`)}
                                    className="w-full px-3 py-2 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5 text-xs w-1/2">
                                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Đến giờ</span>
                                  <input
                                    type="time"
                                    value={cond.endHour?.substring(0, 5) || '22:00'}
                                    onChange={(e) => handleConditionChange(cond.tempId, 'endHour', `${e.target.value}:00`)}
                                    className="w-full px-3 py-2 bg-[#0e0e12] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Extra block for days checkboxes in Golden Hour */}
                          {cond.applyType === 'GoldenHour' && (
                            <div className="flex flex-col gap-1.5 text-xs border-t border-white/5 pt-2">
                              <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Các ngày áp dụng</span>
                              <div className="flex flex-wrap gap-2">
                                {daysListOptions.map(day => {
                                  const selectedDays = cond.daysOfWeek ? cond.daysOfWeek.split(',') : [];
                                  const isChecked = selectedDays.includes(day.value);
                                  return (
                                    <label 
                                      key={day.value}
                                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-bold uppercase cursor-pointer select-none transition-all ${
                                        isChecked 
                                          ? 'border-brand/40 bg-brand/10 text-brand' 
                                          : 'border-white/5 bg-[#0e0e12] text-gray-500 hover:border-white/10'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let newDays = [...selectedDays];
                                          if (e.target.checked) {
                                            newDays.push(day.value);
                                          } else {
                                            newDays = newDays.filter(d => d !== day.value);
                                          }
                                          handleConditionChange(cond.tempId, 'daysOfWeek', newDays.join(','));
                                        }}
                                        className="hidden"
                                      />
                                      {day.label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-6 border-t border-white/5 pt-4">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" fullWidth className="shadow-brand font-black" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu Khuyến Mãi'}
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
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Xóa Khuyến Mãi</h3>
                <p className="text-xs text-gray-400 mt-2 font-semibold">
                  Bạn có chắc chắn muốn xóa chương trình khuyến mãi này không? Hành động này sẽ thực hiện xóa mềm và không ảnh hưởng đến lịch sử giao dịch.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button variant="primary" fullWidth onClick={handleDelete} className="bg-brand hover:bg-brand/90 font-black">
                  Xác Nhận Xóa
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromotionsManagement;
