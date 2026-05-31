import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Percent, Plus, Search, Edit3, Trash2, X, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';


interface Promotion {
  promotionId: number;
  promoCode: string;
  discountValue: number;
  discountType: 'Percentage' | 'FixedAmount';
  startDate: string;
  endDate: string;
  maxUsage: number;
  currentUsage: number;
  isActive: boolean;
}

export const PromotionsManagement: React.FC = () => {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);

  // Search, active filter, and pagination
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 8;

  // CRUD states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    promoCode: '',
    discountValue: 10,
    discountType: 'Percentage' as 'Percentage' | 'FixedAmount',
    startDate: '',
    endDate: '',
    maxUsage: 100,
    isActive: true,
  });

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/promotions', {
        params: {
          Search: search || undefined,
          IsActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
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

  useEffect(() => {
    fetchPromotions();
  }, [search, activeFilter, page]);

  const handleOpenAdd = () => {
    setSelectedPromo(null);
    setForm({
      promoCode: '',
      discountValue: 10,
      discountType: 'Percentage',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      maxUsage: 100,
      isActive: true,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (promo: Promotion) => {
    setSelectedPromo(promo);
    setForm({
      promoCode: promo.promoCode,
      discountValue: promo.discountValue,
      discountType: promo.discountType,
      startDate: promo.startDate.split('T')[0],
      endDate: promo.endDate.split('T')[0],
      maxUsage: promo.maxUsage,
      isActive: promo.isActive,
    });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        promoCode: form.promoCode.toUpperCase().trim(),
        discountValue: form.discountValue,
        discountType: form.discountType,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        maxUsage: form.maxUsage,
        isActive: form.isActive,
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
      showToast('Đã vô hiệu hóa mã khuyến mãi.', 'success');
      setIsDeleteOpen(false);
      fetchPromotions();
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi xóa mã khuyến mãi.', 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Percent size={20} className="text-brand" /> Chiến Dịch Khuyến Mãi
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Tạo mã giảm giá, thiết lập giá trị giảm theo phần trăm hoặc số tiền cố định, và đặt giới hạn sử dụng
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenAdd} className="flex items-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider">
          <Plus size={14} /> Thêm Khuyến Mãi
        </Button>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-semibold">
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã giảm giá..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e12]/60 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-500 shrink-0" />
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2.5 bg-[#0e0e12]/60 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-brand transition-all font-semibold"
          >
            <option value="" className="bg-[#121217]">Tất Cả Chiến Dịch</option>
            <option value="true" className="bg-[#121217]">Đang Hoạt Động</option>
            <option value="false" className="bg-[#121217]">Đã Hết Hạn / Vô Hiệu</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
              <th className="p-4">Mã Giảm Giá</th>
              <th className="p-4">Mức Giảm Giá</th>
              <th className="p-4">Hạn Sử Dụng</th>
              <th className="p-4">Lượt Sử Dụng</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-36" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                  <td className="p-4 text-center"><div className="h-4 bg-white/5 rounded w-12 mx-auto" /></td>
                  <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-500 font-bold">
                  Không tìm thấy chương trình khuyến mãi nào.
                </td>
              </tr>
            ) : (
              promotions.map((promo) => (
                <tr key={promo.promotionId} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4 font-bold text-white font-mono uppercase tracking-wider">{promo.promoCode}</td>
                  <td className="p-4">
                    <span className="font-bold text-green-400">
                      {promo.discountType === 'Percentage' 
                        ? `Giảm ${promo.discountValue}%` 
                        : `Giảm ${promo.discountValue.toLocaleString()} VND`
                      }
                    </span>
                  </td>
                  <td className="p-4 font-sans text-gray-400">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase">Ngày hết hạn</span>
                    <span className="font-mono mt-0.5 block">{new Date(promo.endDate).toLocaleDateString('vi-VN')}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase">
                        <span>Đã dùng</span>
                        <span>{promo.currentUsage} / {promo.maxUsage}</span>
                      </div>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand rounded-full transition-all" 
                          style={{ width: `${Math.min((promo.currentUsage / promo.maxUsage) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-block ${
                      promo.isActive ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-gray-500 border-white/5 bg-white/5'
                    }`}>
                      {promo.isActive ? 'Hoạt động' : 'Hết hạn'}
                    </span>
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
                        title="Vô hiệu hóa"
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
                {selectedPromo ? 'Sửa Chương Trình Khuyến Mãi' : 'Tạo Mã Khuyến Mãi Mới'}
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Input
                  type="text"
                  label="Mã Giảm Giá (Code)"
                  required
                  placeholder="Ví dụ: EXTRA30"
                  value={form.promoCode}
                  onChange={(e) => setForm(prev => ({ ...prev, promoCode: e.target.value }))}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Loại Giảm Giá</span>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value as any }))}
                      className="w-full px-3 py-2.5 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                    >
                      <option value="Percentage" className="bg-[#121216]">Phần trăm (%)</option>
                      <option value="FixedAmount" className="bg-[#121216]">Số tiền cố định (VND)</option>
                    </select>
                  </div>

                  <Input
                    type="number"
                    label={form.discountType === 'Percentage' ? 'Phần trăm giảm' : 'Số tiền giảm'}
                    required
                    value={form.discountValue}
                    onChange={(e) => setForm(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Có hiệu lực từ"
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

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Giới hạn lượt dùng"
                    required
                    value={form.maxUsage}
                    onChange={(e) => setForm(prev => ({ ...prev, maxUsage: parseInt(e.target.value) || 0 }))}
                  />

                  {/* Active Toggle */}
                  <div className="flex flex-col gap-1.5 text-xs text-left justify-end">
                    <label className="flex items-center gap-2 text-white font-bold select-none cursor-pointer pb-2.5">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded bg-[#121216] border-white/10 text-brand focus:ring-0"
                      />
                      Kích hoạt mã
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
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
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Vô Hiệu Hóa Mã</h3>
                <p className="text-xs text-gray-400 mt-2 font-semibold">
                  Bạn có chắc chắn muốn vô hiệu hóa mã giảm giá này không? Khách hàng sẽ không thể sử dụng mã này để thanh toán.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)}>
                  Giữ Lại
                </Button>
                <Button variant="primary" fullWidth onClick={handleDelete} className="bg-brand hover:bg-brand/90 font-black">
                  Vô Hiệu Hóa
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
