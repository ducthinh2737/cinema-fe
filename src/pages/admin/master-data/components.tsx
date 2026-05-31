import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Trash2, Check, X, AlertTriangle, Loader2, RefreshCw, Layers } from 'lucide-react';
import type { MasterDataItem, TabConfig } from './types';
import { Button } from '../../../components/ui/Button';

// 1. Skeleton Loader
export const SkeletonLoader: React.FC<{ columnsCount: number }> = ({ columnsCount }) => {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: columnsCount }).map((_, c) => (
            <td key={c} className="p-4">
              <div className="h-4 bg-white/5 rounded w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

// 2. Empty State View
export const EmptyState: React.FC<{ message: string; showPriceMultiplier: boolean }> = ({ message, showPriceMultiplier }) => {
  return (
    <tr>
      <td colSpan={showPriceMultiplier ? 6 : 5} className="p-16 text-center text-gray-500 font-bold">
        <AlertTriangle size={32} className="mx-auto mb-2 text-gray-600 animate-pulse" />
        {message}
      </td>
    </tr>
  );
};

// 3. Stats Cards
interface StatsCardsProps {
  stats: Record<string, number>;
  tabs: TabConfig[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, tabs }) => {
  // We only display the first 5 counters as requested
  const displayTabs = tabs.slice(0, 5);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {displayTabs.map(tab => {
        const Icon = tab.icon;
        const count = stats[tab.id] || 0;
        return (
          <div
            key={tab.id}
            className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 backdrop-blur-xl shadow-glass flex items-center gap-4 text-left hover:border-white/10 transition-all duration-300 group"
          >
            <div className={`p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 ${tab.color} group-hover:scale-105 transition-transform duration-300`}>
              <Icon size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider truncate">{tab.label}</span>
              <span className="text-lg font-black text-white mt-0.5 tracking-tight">{count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 4. Data Table Component
interface DataTableProps {
  items: MasterDataItem[];
  loading: boolean;
  showPriceMultiplier: boolean;
  onEdit: (item: MasterDataItem) => void;
  onToggleDelete: (item: MasterDataItem) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  items,
  loading,
  showPriceMultiplier,
  onEdit,
  onToggleDelete
}) => {
  const columnsCount = showPriceMultiplier ? 6 : 5;

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
            <th className="p-4">ID</th>
            <th className="p-4">Tên</th>
            <th className="p-4 max-w-[280px]">Mô Tả</th>
            {showPriceMultiplier && <th className="p-4">Hệ Số Phụ Thu</th>}
            <th className="p-4">Ngày Tạo</th>
            <th className="p-4">Trạng Thái</th>
            <th className="p-4 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
          {loading ? (
            <SkeletonLoader columnsCount={columnsCount} />
          ) : items.length === 0 ? (
            <EmptyState message='Không tìm thấy bản ghi nào khớp với điều kiện lọc. Nhấn "Thêm Mới" để tạo.' showPriceMultiplier={showPriceMultiplier} />
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                <td className="p-4 font-mono text-gray-500">#{item.id}</td>
                <td className="p-4 font-bold text-white max-w-[140px] truncate">{item.name}</td>
                <td className="p-4 text-gray-400 font-medium max-w-[240px] truncate" title={item.description}>
                  {item.description}
                </td>
                {showPriceMultiplier && (
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 bg-brand-gold/15 border border-brand-gold/25 text-brand-gold text-[9px] font-black rounded-full shadow-[0_0_10px_rgba(229,169,59,0.1)]">
                      x{(item.priceMultiplier ?? 1).toFixed(2)}
                    </span>
                  </td>
                )}
                <td className="p-4 font-mono text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="p-4">
                  {item.isDeleted ? (
                    <span className="px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black rounded-full uppercase tracking-wider">
                      Ngừng sử dụng
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-full uppercase tracking-wider">
                      Đang sử dụng
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold/30 text-brand-gold rounded-xl transition-all cursor-pointer hover:bg-brand-gold/5"
                      title="Chỉnh sửa"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => onToggleDelete(item)}
                      className={`p-2 bg-white/5 border border-white/5 rounded-xl transition-all cursor-pointer ${
                        item.isDeleted
                          ? 'hover:border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5'
                          : 'hover:border-red-500/30 text-red-500 hover:bg-red-500/5'
                      }`}
                      title={item.isDeleted ? 'Kích hoạt lại' : 'Ngừng hoạt động'}
                    >
                      {item.isDeleted ? <RefreshCw size={12} /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// 5. Add / Edit Data Form Modal
interface DataFormModalProps {
  isOpen: boolean;
  saving: boolean;
  editingItem: MasterDataItem | null;
  activeTabLabel: string;
  showPriceMultiplier: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; description: string; priceMultiplier?: number }) => void;
}

export const DataFormModal: React.FC<DataFormModalProps> = ({
  isOpen,
  saving,
  editingItem,
  activeTabLabel,
  showPriceMultiplier,
  onClose,
  onSave
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priceMultiplier, setPriceMultiplier] = React.useState(1.0);

  React.useEffect(() => {
    if (isOpen) {
      setName(editingItem?.name ?? '');
      setDescription(editingItem?.description ?? '');
      setPriceMultiplier(editingItem?.priceMultiplier ?? 1.0);
    }
  }, [isOpen, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, priceMultiplier });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-left"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
              <Layers size={16} className="text-brand" />
              {editingItem ? 'Cập Nhật' : 'Thêm Mới'} — {activeTabLabel}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Tên Tên Gọi</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#121216] border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors font-semibold"
                  placeholder="Nhập tên gọi..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mô Tả Chi Tiết</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#121216] border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors font-semibold resize-none"
                  placeholder="Mô tả chức năng/thông tin danh mục..."
                />
              </div>

              {showPriceMultiplier && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Hệ Số Phụ Thu (VD: 1.2 = +20%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={priceMultiplier}
                    onChange={e => setPriceMultiplier(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-4 py-2.5 bg-[#121216] border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 focus:outline-none transition-colors font-semibold"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <Button type="button" variant="secondary" fullWidth onClick={onClose}>Hủy</Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="shadow-brand font-black flex items-center justify-center gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// 6. Delete / Change Status Confirmation Modal
interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: MasterDataItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirm
}) => {
  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {item.isDeleted ? 'Kích Hoạt Lại Dữ Liệu' : 'Xác Nhận Ngừng Sử Dụng'}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-semibold leading-relaxed">
                {item.isDeleted
                  ? `Bạn có chắc muốn tái kích hoạt và sử dụng lại danh mục "${item.name}" trong hệ thống?`
                  : `Hệ thống sẽ chuyển trạng thái của "${item.name}" thành "Ngừng sử dụng". Suất chiếu và phim liên quan vẫn được bảo lưu.`}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="secondary" fullWidth onClick={onClose}>Hủy bỏ</Button>
              <Button
                variant={item.isDeleted ? 'secondary' : 'primary'}
                fullWidth
                onClick={onConfirm}
                className="font-black"
              >
                Đồng ý
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
