import React, { useState, useMemo, useCallback } from 'react';
import { Database, Plus, Search, Download, Tag, Layout, Armchair, Tv, Languages, Captions, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMasterData } from './master-data/useMasterData';
import { DataTable, StatsCards, DataFormModal, DeleteConfirmModal } from './master-data/components';
import type { DataTab, TabConfig, MasterDataItem } from './master-data/types';
import { Button } from '../../components/ui/Button';

export const MasterDataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DataTab>('genres');

  // Hooks containing fully isolated master data controllers
  const {
    items,
    allItems,
    loading,
    searchText,
    setSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalRecords,
    stats,
    createItem,
    updateItem,
    toggleItemDeleteStatus
  } = useMasterData(activeTab);

  // Shared modal actions
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [targetItem, setTargetItem] = useState<MasterDataItem | null>(null);
  const [saving, setSaving] = useState(false);

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'genres', label: 'Thể Loại Phim', icon: Tag, color: 'text-rose-400', defaultDescription: 'Thể loại phim cho các buổi chiếu rạp' },
    { id: 'halltypes', label: 'Loại Phòng Chiếu', icon: Layout, color: 'text-blue-400', defaultDescription: 'Loại phòng chiếu với các trang thiết bị tương ứng' },
    { id: 'seattypes', label: 'Loại Ghế Ngồi', icon: Armchair, color: 'text-amber-400', defaultDescription: 'Loại ghế ngồi đi kèm phụ thu giá vé' },
    { id: 'formats', label: 'Định Dạng Phim', icon: Tv, color: 'text-purple-400', defaultDescription: 'Định dạng công nghệ phim chiếu (2D, 3D, IMAX...)' },
    { id: 'languages', label: 'Ngôn Ngữ', icon: Languages, color: 'text-emerald-400', defaultDescription: 'Ngôn ngữ âm thanh tiếng nói chính thức' },
    { id: 'subtitles', label: 'Loại Phụ Đề', icon: Captions, color: 'text-cyan-400', defaultDescription: 'Loại phụ đề/lồng tiếng bổ sung của phim' },
    { id: 'ratings', label: 'Phân Loại Độ Tuổi', icon: ShieldCheck, color: 'text-orange-400', defaultDescription: 'Độ tuổi giới hạn được phép xem phim' },
  ], []);

  const activeTabConfig = useMemo(() => {
    return tabs.find(t => t.id === activeTab) || tabs[0];
  }, [activeTab, tabs]);

  const showPriceMultiplier = activeTab === 'seattypes';

  // Open creation modal
  const handleOpenAdd = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  // Open editor modal
  const handleOpenEdit = useCallback((item: MasterDataItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  // Open delete status modal
  const handleOpenToggleDelete = useCallback((item: MasterDataItem) => {
    setTargetItem(item);
    setIsDeleteOpen(true);
  }, []);

  // Execute Save Action
  const handleSave = useCallback(async (payload: { name: string; description: string; priceMultiplier?: number }) => {
    setSaving(true);
    let success = false;
    if (editingItem) {
      success = await updateItem(editingItem.id, payload);
    } else {
      success = await createItem(payload);
    }
    setSaving(false);
    if (success) {
      setIsFormOpen(false);
    }
  }, [editingItem, createItem, updateItem]);

  // Execute Delete Action
  const handleConfirmToggleDelete = useCallback(async () => {
    if (!targetItem) return;
    const success = await toggleItemDeleteStatus(targetItem.id);
    if (success) {
      setIsDeleteOpen(false);
      setTargetItem(null);
    }
  }, [targetItem, toggleItemDeleteStatus]);

  // Pagination bounds text helper
  const pageBoundsText = useMemo(() => {
    if (totalRecords === 0) return '0 - 0 của 0 bản ghi';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalRecords);
    return `${start} - ${end} của ${totalRecords} bản ghi`;
  }, [page, pageSize, totalRecords]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalRecords / pageSize) || 1;
  }, [totalRecords, pageSize]);

  // Export CSV Action
  const handleExportCSV = useCallback(() => {
    const headers = ['ID', 'Tên Gọi', 'Mô Tả Chi Tiết', 'Hệ Số Phụ Thu', 'Ngày Tạo', 'Trạng Thái'];
    const rows = allItems.map(item => [
      item.id,
      item.name,
      item.description,
      item.priceMultiplier ? `x${item.priceMultiplier}` : '-',
      new Date(item.createdAt).toLocaleString('vi-VN'),
      item.isDeleted ? 'Ngừng sử dụng' : 'Đang sử dụng'
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `master_data_${activeTabConfig.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allItems, activeTabConfig]);

  // Export Excel Action
  const handleExportExcel = useCallback(() => {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8" /><style>table { border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 6px 12px; font-family: sans-serif; }</style></head>`;
    html += `<body><h2>Bảng Danh Mục: ${activeTabConfig.label}</h2><table>`;
    html += `<tr style="background:#f2f2f2;"><th>ID</th><th>Tên Gọi</th><th>Mô Tả Chi Tiết</th><th>Hệ Số Phụ Thu</th><th>Ngày Tạo</th><th>Trạng Thái</th></tr>`;
    allItems.forEach(item => {
      html += `<tr>`;
      html += `<td>${item.id}</td>`;
      html += `<td>${item.name}</td>`;
      html += `<td>${item.description}</td>`;
      html += `<td>${item.priceMultiplier ? `x${item.priceMultiplier}` : '-'}</td>`;
      html += `<td>${new Date(item.createdAt).toLocaleString('vi-VN')}</td>`;
      html += `<td>${item.isDeleted ? 'Ngừng sử dụng' : 'Đang sử dụng'}</td>`;
      html += `</tr>`;
    });
    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `master_data_${activeTabConfig.id}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allItems, activeTabConfig]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Database size={20} className="text-brand" /> Quản Lý Dữ Liệu Nguồn
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Quản trị danh mục tham chiếu, cấu hình phòng chiếu và loại vé hệ thống cinema
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider shrink-0"
        >
          <Plus size={14} /> Thêm Mới
        </Button>
      </div>

      {/* Statistics dashboard */}
      <StatsCards stats={stats} tabs={tabs} />

      {/* Sub Tabs Navigation */}
      <div className="flex gap-2 flex-wrap border-b border-white/5 pb-2.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                isActive
                  ? 'bg-white/10 border-white/10 text-white'
                  : 'border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={13} className={isActive ? tab.color : 'text-gray-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filtering, Search & Export Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder={`Tìm kiếm ${activeTabConfig.label.toLowerCase()}...`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e12]/30 border border-white/5 focus:border-brand rounded-2xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0e0e12]/40 border border-white/5 text-gray-400 hover:text-white hover:border-white/10 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="Xuất file dạng CSV"
          >
            <Download size={13} />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0e0e12]/40 border border-white/5 text-gray-400 hover:text-white hover:border-white/10 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="Xuất file Excel"
          >
            <Download size={13} />
            Excel
          </button>
        </div>
      </div>

      {/* Main Table component */}
      <DataTable
        items={items}
        loading={loading}
        showPriceMultiplier={showPriceMultiplier}
        onEdit={handleOpenEdit}
        onToggleDelete={handleOpenToggleDelete}
      />

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-400">
        <div>
          <span>Hiển thị: </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value) || 10);
              setPage(1);
            }}
            className="bg-[#0e0e12]/60 border border-white/5 text-gray-200 px-2 py-1 rounded-lg focus:outline-none text-[11px] font-bold"
          >
            <option value={5}>5 dòng</option>
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
          <span className="ml-4 font-medium text-gray-500">{pageBoundsText}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="p-2 border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all cursor-pointer text-white"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-3 font-bold text-white text-xs select-none">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="p-2 border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all cursor-pointer text-white"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ADD / EDIT FORM DIALOG */}
      <DataFormModal
        isOpen={isFormOpen}
        saving={saving}
        editingItem={editingItem}
        activeTabLabel={activeTabConfig.label}
        showPriceMultiplier={showPriceMultiplier}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />

      {/* CONFIRM TOGGLE DELETE/INACTIVE DIALOG */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        item={targetItem}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmToggleDelete}
      />
    </div>
  );
};
