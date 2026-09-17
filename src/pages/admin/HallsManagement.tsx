import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import {
  Tv,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Building,
  Users,
  Wrench,
  XCircle,
  CheckCircle2,
  Layers,
  ChevronDown
} from 'lucide-react';


// Types match backend DTOs & frontend extensions
interface ParsedHall {
  hallId: number;
  cinemaId: number;
  cinemaName?: string;
  hallName: string;
  hallTypeId: number;
  hallTypeName: string;
  capacity: number;
  description: string;
  hallCode: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
  createdAt: string;
  supportedFormats: string[];
  rawDescription?: string;
}

interface CinemaOption {
  cinemaId: number;
  cinemaName: string;
}

interface HallTypeOption {
  hallTypeId: number;
  typeName: string;
  description?: string;
}

export const HallsManagement: React.FC = () => {
  const { showToast } = useToast();
  const [allHalls, setAllHalls] = useState<ParsedHall[]>([]);
  const [cinemasList, setCinemasList] = useState<CinemaOption[]>([]);
  const [hallTypesList, setHallTypesList] = useState<HallTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [movieFormatsList, setMovieFormatsList] = useState<{ movieFormatId: number; formatName: string }[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCinema, setFilterCinema] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // CRUD & Modals States
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHall, setSelectedHall] = useState<ParsedHall | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);

  // Form State
  const [form, setForm] = useState({
    cinemaId: 0,
    hallCode: '',
    hallName: '',
    hallTypeId: 0,
    capacity: 50,
    description: '',
    status: 'Active' as 'Active' | 'Maintenance' | 'Inactive',
    supportedFormats: [] as string[]
  });

  // Warnings / Soft Delete confirmation states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [hallToDelete, setHallToDelete] = useState<ParsedHall | null>(null);
  const [checkingRelations, setCheckingRelations] = useState(false);
  const [associatedSeatsCount, setAssociatedSeatsCount] = useState(0);
  const [associatedShowtimesCount, setAssociatedShowtimesCount] = useState(0);

  // Fetch all halls and references
  const fetchHalls = async () => {
    setLoading(true);
    try {
      // 1. Fetch cinemas reference
      const cinemasRes = await apiClient.get<any>('/cinemas', { params: { PageSize: 1000 } });
      const cinemasData = cinemasRes.data?.data ?? cinemasRes.data;
      const cinemaItems: CinemaOption[] = cinemasData?.items ?? (Array.isArray(cinemasData) ? cinemasData : []);
      setCinemasList(cinemaItems);

      // 2. Fetch hall types reference
      const hallTypesRes = await apiClient.get<any>('/halltypes');
      const hallTypesData: HallTypeOption[] = hallTypesRes.data?.data ?? hallTypesRes.data ?? [];
      setHallTypesList(hallTypesData);

      // 2.5. Fetch movie formats reference
      try {
        const formatsRes = await apiClient.get<any>('/movieformats');
        const formatsData = formatsRes.data || [];
        setMovieFormatsList(formatsData.length > 0 ? formatsData : [
          { movieFormatId: 1, formatName: '2D' },
          { movieFormatId: 2, formatName: '3D' },
          { movieFormatId: 3, formatName: 'IMAX' }
        ]);
      } catch (err) {
        console.error('Failed to fetch movie formats in HallsManagement', err);
        setMovieFormatsList([
          { movieFormatId: 1, formatName: '2D' },
          { movieFormatId: 2, formatName: '3D' },
          { movieFormatId: 3, formatName: 'IMAX' }
        ]);
      }

      // 3. Parallel fetch of halls for each cinema
      if (cinemaItems.length > 0) {
        const promises = cinemaItems.map(async (cinema) => {
          try {
            const res = await apiClient.get<any>(`/cinemas/${cinema.cinemaId}/halls`);
            const data = res.data?.data ?? res.data ?? [];
            return (Array.isArray(data) ? data : []).map((h: any) => {
              let status: 'Active' | 'Maintenance' | 'Inactive' = 'Active';
              let hallCode = `H-${h.hallId}`;
              let createdAt = h.createdAt || new Date().toISOString();
              let cleanDescription = h.description || '';
              let supportedFormats: string[] = [];

              if (h.description && h.description.trim().startsWith('{')) {
                try {
                  const obj = JSON.parse(h.description);
                  status = obj.status || 'Active';
                  hallCode = obj.hallCode || `H-${h.hallId}`;
                  createdAt = obj.createdAt || createdAt;
                  cleanDescription = obj.description || '';
                  supportedFormats = obj.supportedFormats || [];
                } catch (e) {
                  // Fallback
                }
              }

              if (supportedFormats.length === 0) {
                const typeName = (h.hallTypeName || '').toUpperCase();
                if (typeName.includes('IMAX')) {
                  supportedFormats = ['IMAX', '3D', '2D'];
                } else {
                  supportedFormats = ['2D', '3D'];
                }
              }

              return {
                hallId: h.hallId,
                cinemaId: h.cinemaId,
                cinemaName: cinema.cinemaName,
                hallName: h.hallName,
                hallTypeId: h.hallTypeId,
                hallTypeName: h.hallTypeName || 'Standard',
                capacity: h.capacity || 0,
                description: cleanDescription,
                hallCode,
                status,
                createdAt,
                supportedFormats,
                rawDescription: h.description
              } as ParsedHall;
            });
          } catch (e) {
            console.error(`Failed to load halls for cinema ${cinema.cinemaId}`, e);
            return [];
          }
        });

        const results = await Promise.all(promises);
        setAllHalls(results.flat());
      } else {
        setAllHalls([]);
      }
    } catch (error) {
      console.error('Failed to load halls data', error);
      showToast('Không thể tải dữ liệu phòng chiếu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  // Filter implementation
  const filteredHalls = allHalls.filter((hall) => {
    const matchesSearch =
      hall.hallName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hall.hallCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCinema = filterCinema ? hall.cinemaId === parseInt(filterCinema) : true;
    const matchesType = filterType ? hall.hallTypeId === parseInt(filterType) : true;
    const matchesStatus = filterStatus ? hall.status === filterStatus : true;

    return matchesSearch && matchesCinema && matchesType && matchesStatus;
  });

  // Pagination logic
  const totalCount = filteredHalls.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedHalls = filteredHalls.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterCinema, filterType, filterStatus]);

  // Statistics
  const totalHallsCount = allHalls.length;
  const totalSeatsCount = allHalls.reduce((sum, h) => sum + h.capacity, 0);
  const activeHallsCount = allHalls.filter((h) => h.status === 'Active').length;
  const maintenanceHallsCount = allHalls.filter((h) => h.status === 'Maintenance').length;

  // Save Add/Edit Hall
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.hallName.trim()) {
      showToast('Vui lòng nhập tên phòng chiếu.', 'warning');
      return;
    }
    if (!form.hallCode.trim()) {
      showToast('Vui lòng nhập mã phòng chiếu.', 'warning');
      return;
    }
    if (form.cinemaId === 0 && !selectedHall) {
      showToast('Vui lòng chọn rạp chiếu.', 'warning');
      return;
    }

    setSaving(true);
    try {
      let originalLayout: any = {};
      if (selectedHall && selectedHall.rawDescription && selectedHall.rawDescription.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(selectedHall.rawDescription);
          if (parsed.seats || parsed.rows || parsed.cols) {
            originalLayout = {
              rows: parsed.rows,
              cols: parsed.cols,
              screenPosition: parsed.screenPosition,
              aisles: parsed.aisles,
              sections: parsed.sections,
              seats: parsed.seats
            };
          }
        } catch (e) {}
      }

      // Build extended description
      const serializedDescription = JSON.stringify({
        status: form.status,
        hallCode: form.hallCode.trim().toUpperCase(),
        createdAt: selectedHall?.createdAt || new Date().toISOString(),
        description: form.description.trim(),
        supportedFormats: form.supportedFormats,
        ...originalLayout
      });

      if (selectedHall) {
        // Update Hall API
        const payload = {
          hallName: form.hallName.trim(),
          hallTypeId: form.hallTypeId,
          capacity: form.capacity,
          description: serializedDescription
        };
        await apiClient.put(`/halls/${selectedHall.hallId}`, payload);
        showToast('Cập nhật phòng chiếu thành công.', 'success');
      } else {
        // Create Hall API
        const payload = {
          cinemaId: form.cinemaId,
          hallName: form.hallName.trim(),
          hallTypeId: form.hallTypeId,
          capacity: form.capacity,
          description: serializedDescription
        };
        await apiClient.post('/halls', payload);
        showToast('Tạo mới phòng chiếu thành công.', 'success');
      }

      setIsOpen(false);
      fetchHalls();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.Message || error.message || 'Lỗi khi lưu phòng chiếu.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for auto generating Hall Code
  const getAbbreviation = (str: string) => {
    if (!str) return '';
    const cleanStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = cleanStr.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 3).toUpperCase();
    }
    return words.map(w => w.charAt(0)).join('').toUpperCase();
  };

  const getHallTypeAbbreviation = (typeName: string) => {
    if (!typeName) return '';
    const clean = typeName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (clean.includes('thuong') || clean.includes('standard')) return 'STD';
    if (clean.includes('vip')) return 'VIP';
    if (clean.includes('imax')) return 'IMAX';
    if (clean.includes('couple') || clean.includes('doi') || clean.includes('sweetbox')) return 'CP';
    return clean.replace(/\s+/g, '').slice(0, 3).toUpperCase();
  };

  useEffect(() => {
    if (!isOpen) return;

    const selectedCinema = cinemasList.find(c => c.cinemaId === form.cinemaId);
    const selectedType = hallTypesList.find(t => t.hallTypeId === form.hallTypeId);

    if (selectedCinema && selectedType) {
      const cinemaAbbr = getAbbreviation(selectedCinema.cinemaName);
      const typeAbbr = getHallTypeAbbreviation(selectedType.typeName);

      const cinemaHalls = allHalls.filter(h => h.cinemaId === form.cinemaId);
      let roomNum = 1;
      if (selectedHall) {
        const sortedHalls = [...cinemaHalls].sort((a, b) => a.hallId - b.hallId);
        const existingIdx = sortedHalls.findIndex(h => h.hallId === selectedHall.hallId);
        roomNum = existingIdx !== -1 ? existingIdx + 1 : cinemaHalls.length + 1;
      } else {
        roomNum = cinemaHalls.length + 1;
      }

      const roomStr = roomNum < 10 ? `0${roomNum}` : `${roomNum}`;
      const generatedCode = `${cinemaAbbr}-${typeAbbr}-${roomStr}`;
      
      const defaultNamePattern = /^(Phòng\s+\d+|Standard\s+Hall\s+\d+|IMAX\s+Theater\s+\d+|VIP\s+Lounge\s+\d+|Phòng\s+Chiếu\s+\d+|.*Hall\s+\d+)/i;
      const shouldUpdateName = !form.hallName || defaultNamePattern.test(form.hallName) || !selectedHall;
      
      let generatedName = form.hallName;
      if (shouldUpdateName) {
        generatedName = `Phòng ${roomStr}`;
      }

      setForm(prev => {
        let dynamicFormats = prev.supportedFormats;
        if (!selectedHall) {
          const typeUpper = selectedType.typeName.toUpperCase();
          if (typeUpper.includes('IMAX')) {
            dynamicFormats = ['IMAX', '3D', '2D'];
          } else if (typeUpper.includes('3D')) {
            dynamicFormats = ['2D', '3D'];
          } else {
            dynamicFormats = ['2D', '3D']; // Standard, VIP, etc. default to both 2D and 3D to be safe
          }
        }

        const isFormatsChanged = JSON.stringify(prev.supportedFormats) !== JSON.stringify(dynamicFormats);
        if (prev.hallCode === generatedCode && prev.hallName === generatedName && !isFormatsChanged) return prev;
        
        return {
          ...prev,
          hallCode: generatedCode,
          hallName: generatedName,
          supportedFormats: dynamicFormats
        };
      });
    }
  }, [form.cinemaId, form.hallTypeId, isOpen, cinemasList, hallTypesList, allHalls, selectedHall]);

  // Open Edit Form
  const handleOpenEdit = (hall: ParsedHall) => {
    setSelectedHall(hall);
    setForm({
      cinemaId: hall.cinemaId,
      hallCode: hall.hallCode,
      hallName: hall.hallName,
      hallTypeId: hall.hallTypeId,
      capacity: hall.capacity,
      description: hall.description,
      status: hall.status,
      supportedFormats: hall.supportedFormats || []
    });
    setIsOpen(true);
  };

  // Open Add Form
  const handleOpenAdd = () => {
    setSelectedHall(null);
    setForm({
      cinemaId: cinemasList[0]?.cinemaId || 0,
      hallCode: '',
      hallName: '',
      hallTypeId: hallTypesList[0]?.hallTypeId || 0,
      capacity: 0,
      description: '',
      status: 'Active',
      supportedFormats: ['2D', '3D']
    });
    setIsOpen(true);
  };

  // Status inline toggle handler
  const handleStatusChange = async (hall: ParsedHall, newStatus: 'Active' | 'Maintenance' | 'Inactive') => {
    try {
      const serializedDescription = JSON.stringify({
        status: newStatus,
        hallCode: hall.hallCode,
        createdAt: hall.createdAt,
        description: hall.description,
        supportedFormats: hall.supportedFormats
      });

      const payload = {
        hallName: hall.hallName,
        hallTypeId: hall.hallTypeId,
        capacity: hall.capacity,
        description: serializedDescription
      };

      await apiClient.put(`/halls/${hall.hallId}`, payload);
      showToast(`Đã đổi trạng thái phòng chiếu sang ${
        newStatus === 'Active' ? 'Hoạt động' : newStatus === 'Maintenance' ? 'Bảo trì' : 'Ngưng hoạt động'
      }`, 'success');
      
      setStatusDropdownOpen(null);
      // Refresh local state list directly for immediate update
      setAllHalls(prev => prev.map(h => h.hallId === hall.hallId ? { ...h, status: newStatus } : h));
    } catch (error: any) {
      console.error(error);
      showToast('Không thể đổi trạng thái phòng chiếu.', 'error');
    }
  };

  // Delete Action Trigger & Verification
  const handleDeleteTrigger = async (hall: ParsedHall) => {
    setHallToDelete(hall);
    setIsDeleteOpen(true);
    setCheckingRelations(true);
    setAssociatedSeatsCount(0);
    setAssociatedShowtimesCount(0);

    try {
      // 1. Fetch Seats
      const seatsRes = await apiClient.get<any>(`/halls/${hall.hallId}/seats`).catch(() => null);
      const seats = seatsRes?.data?.data ?? seatsRes?.data ?? [];
      setAssociatedSeatsCount(Array.isArray(seats) ? seats.length : 0);

      // 2. Fetch Showtimes & filter
      const showtimesRes = await apiClient.get<any>('/showtimes', { params: { PageNumber: 1, PageSize: 1000 } }).catch(() => null);
      const showtimes = showtimesRes?.data?.data?.items ?? showtimesRes?.data ?? [];
      const now = new Date();
      const futureShowtimes = (Array.isArray(showtimes) ? showtimes : []).filter(
        (st: any) => st.hallId === hall.hallId && new Date(st.startTime) > now
      );
      setAssociatedShowtimesCount(futureShowtimes.length);
    } catch (e) {
      console.error('Failed to verify relationships', e);
    } finally {
      setCheckingRelations(false);
    }
  };

  // Confirm delete (soft delete API call)
  const handleDeleteConfirm = async () => {
    if (!hallToDelete) return;

    try {
      await apiClient.delete(`/halls/${hallToDelete.hallId}`);
      showToast('Đã xóa phòng chiếu thành công (Soft delete).', 'success');
      setIsDeleteOpen(false);
      setHallToDelete(null);
      fetchHalls();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.Message || 'Không thể xóa phòng chiếu do lỗi hệ thống.';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Tv size={20} className="text-brand animate-pulse" /> Quản Lý Phòng Chiếu
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Thiết lập phòng chiếu, cấu hình loại màn hình, quản lý sức chứa và đổi trạng thái vận hành của phòng máy
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
        >
          <Plus size={14} /> Thêm Phòng Chiếu
        </Button>
      </div>

      {/* 2. Real-time statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-glass border border-glass-border shadow-glass backdrop-blur-md rounded-2xl flex items-center justify-between hover:border-white/10 transition-all group">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Tổng số phòng</span>
            <span className="text-xl font-black text-white group-hover:text-brand transition-colors">{totalHallsCount}</span>
          </div>
          <div className="p-2.5 bg-brand/5 border border-brand/10 text-brand rounded-xl">
            <Tv size={14} />
          </div>
        </div>

        <div className="p-4 bg-glass border border-glass-border shadow-glass backdrop-blur-md rounded-2xl flex items-center justify-between hover:border-white/10 transition-all group">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Tổng số ghế</span>
            <span className="text-xl font-black text-white group-hover:text-brand-gold transition-colors">{totalSeatsCount}</span>
          </div>
          <div className="p-2.5 bg-brand-gold/5 border border-brand-gold/10 text-brand-gold rounded-xl">
            <Users size={14} />
          </div>
        </div>

        <div className="p-4 bg-glass border border-glass-border shadow-glass backdrop-blur-md rounded-2xl flex items-center justify-between hover:border-white/10 transition-all group">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Phòng hoạt động</span>
            <span className="text-xl font-black text-emerald-400">{activeHallsCount}</span>
          </div>
          <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 size={14} />
          </div>
        </div>

        <div className="p-4 bg-glass border border-glass-border shadow-glass backdrop-blur-md rounded-2xl flex items-center justify-between hover:border-white/10 transition-all group">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Phòng bảo trì</span>
            <span className="text-xl font-black text-yellow-500">{maintenanceHallsCount}</span>
          </div>
          <div className="p-2.5 bg-yellow-500/5 border border-yellow-500/10 text-yellow-500 rounded-xl">
            <Wrench size={14} />
          </div>
        </div>
      </div>

      {/* 3. Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 font-semibold text-xs text-gray-300">
        
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên phòng hoặc mã phòng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e12]/60 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold shadow-inner"
          />
        </div>

        {/* Cinema selector */}
        <div className="flex items-center gap-1.5 bg-[#0e0e12]/40 border border-white/5 rounded-xl px-2.5">
          <Building size={14} className="text-gray-500 shrink-0" />
          <select
            value={filterCinema}
            onChange={(e) => setFilterCinema(e.target.value)}
            className="w-full bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold py-2.5"
          >
            <option value="" className="bg-[#121217]">Tất Cả Rạp</option>
            {cinemasList.map((c) => (
              <option key={c.cinemaId} value={c.cinemaId} className="bg-[#121217]">{c.cinemaName}</option>
            ))}
          </select>
        </div>

        {/* Hall Type selector */}
        <div className="flex items-center gap-1.5 bg-[#0e0e12]/40 border border-white/5 rounded-xl px-2.5">
          <Layers size={14} className="text-gray-500 shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold py-2.5"
          >
            <option value="" className="bg-[#121217]">Tất Cả Loại Phòng</option>
            {hallTypesList.map((t) => (
              <option key={t.hallTypeId} value={t.hallTypeId} className="bg-[#121217]">{t.typeName}</option>
            ))}
          </select>
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-1.5 bg-[#0e0e12]/40 border border-white/5 rounded-xl px-2.5">
          <Wrench size={14} className="text-gray-500 shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-transparent border-0 text-xs text-gray-300 focus:outline-none font-semibold py-2.5"
          >
            <option value="" className="bg-[#121217]">Tất Cả Trạng Thái</option>
            <option value="Active" className="bg-[#121217]">Hoạt Động</option>
            <option value="Maintenance" className="bg-[#121217]">Bảo Trì</option>
            <option value="Inactive" className="bg-[#121217]">Ngưng Hoạt Động</option>
          </select>
        </div>
      </div>

      {/* 4. Table Grid */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md shadow-glass">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
              <th className="p-4">Mã Phòng</th>
              <th className="p-4">Tên Phòng Chiếu</th>
              <th className="p-4">Rạp Chiếu</th>
              <th className="p-4">Loại Phòng</th>
              <th className="p-4">Số Ghế</th>
              <th className="p-4">Ngày Tạo</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-4"><SkeletonLoader className="h-4 w-12 rounded" /></td>
                  <td className="p-4"><SkeletonLoader className="h-4 w-32 rounded" /></td>
                  <td className="p-4"><SkeletonLoader className="h-4 w-28 rounded" /></td>
                  <td className="p-4"><SkeletonLoader className="h-4 w-16 rounded" /></td>
                  <td className="p-4"><SkeletonLoader className="h-4 w-10 rounded" /></td>
                  <td className="p-4"><SkeletonLoader className="h-4 w-24 rounded" /></td>
                  <td className="p-4 text-center"><SkeletonLoader className="h-6 w-16 mx-auto rounded-full" /></td>
                  <td className="p-4 text-right"><SkeletonLoader className="h-8 w-20 ml-auto rounded-lg" /></td>
                </tr>
              ))
            ) : paginatedHalls.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-gray-500 font-bold">
                  Không tìm thấy phòng chiếu nào phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              paginatedHalls.map((hall) => (
                <tr key={hall.hallId} className="hover:bg-white/[0.01] transition-colors group">
                  
                  {/* Hall Code */}
                  <td className="p-4 font-bold text-white font-mono uppercase tracking-wider">{hall.hallCode}</td>
                  
                  {/* Hall Name */}
                  <td className="p-4">
                    <span className="text-white block font-bold group-hover:text-brand transition-colors">{hall.hallName}</span>
                    {hall.description && (
                      <span className="text-[10px] text-gray-500 block truncate max-w-[200px] mt-0.5">{hall.description}</span>
                    )}
                  </td>
 
                  {/* Cinema */}
                  <td className="p-4 text-gray-400 font-medium">{hall.cinemaName || `Rạp #${hall.cinemaId}`}</td>
 
                  {/* Hall Type */}
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/5 text-brand-gold border border-white/5">
                        {hall.hallTypeName}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(hall.supportedFormats || []).map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-brand/10 text-brand border border-brand/10">
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
 
                  {/* Capacity */}
                  <td className="p-4 font-mono font-bold text-gray-300">{hall.capacity} ghế</td>

                  {/* Created Date */}
                  <td className="p-4 font-mono text-[10px] text-gray-500">
                    {new Date(hall.createdAt).toLocaleDateString('vi-VN')}
                  </td>

                  {/* Status Dropdown Trigger */}
                  <td className="p-4 text-center relative">
                    <div className="inline-block">
                      <button
                        onClick={() => setStatusDropdownOpen(statusDropdownOpen === hall.hallId ? null : hall.hallId)}
                        className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all cursor-pointer ${
                          hall.status === 'Active'
                            ? 'text-green-400 border-green-500/20 bg-green-500/5 hover:bg-green-500/10'
                            : hall.status === 'Maintenance'
                            ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10'
                            : 'text-brand border-brand/20 bg-brand/5 hover:bg-brand/10'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          hall.status === 'Active' ? 'bg-green-400' : hall.status === 'Maintenance' ? 'bg-yellow-400' : 'bg-brand'
                        }`} />
                        {hall.status === 'Active' ? 'Hoạt động' : hall.status === 'Maintenance' ? 'Bảo trì' : 'Ngưng HD'}
                        <ChevronDown size={10} className="opacity-60" />
                      </button>

                      <AnimatePresence>
                        {statusDropdownOpen === hall.hallId && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(null)} />
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-[#121217] border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 shrink-0 w-28 text-left font-bold text-[10px]"
                            >
                              <button
                                onClick={() => handleStatusChange(hall, 'Active')}
                                className="w-full px-2.5 py-2 text-green-400 hover:bg-green-500/5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors text-left"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                                Hoạt động
                              </button>
                              <button
                                onClick={() => handleStatusChange(hall, 'Maintenance')}
                                className="w-full px-2.5 py-2 text-yellow-400 hover:bg-yellow-500/5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors text-left"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" />
                                Bảo trì
                              </button>
                              <button
                                onClick={() => handleStatusChange(hall, 'Inactive')}
                                className="w-full px-2.5 py-2 text-brand hover:bg-brand/5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors text-left"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                                Ngưng HD
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEdit(hall)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
                        title="Sửa phòng"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(hall)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer"
                        title="Xóa phòng (Soft Delete)"
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

      {/* 5. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mt-2 select-none">
          <span>Trang {page} / {totalPages} (Tổng số {totalCount} kết quả)</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="text-[10px]"
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="text-[10px]"
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-left my-8"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
                <Tv size={16} className="text-[#e50914]" />
                {selectedHall ? 'Cập Nhật Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-5">
                
                {/* Cinema Selection (Disabled when editing) */}
                <div className="flex flex-col gap-1.5 text-xs font-semibold">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">Rạp Chiếu</span>
                  <select
                    value={form.cinemaId}
                    disabled={!!selectedHall}
                    onChange={(e) => setForm(prev => ({ ...prev, cinemaId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-3 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value={0} disabled>Chọn Rạp Chiếu</option>
                    {cinemasList.map((c) => (
                      <option key={c.cinemaId} value={c.cinemaId}>{c.cinemaName}</option>
                    ))}
                  </select>
                </div>

                {/* Tên Phòng & Loại Phòng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    label="Tên Phòng Chiếu"
                    required
                    placeholder="Ví dụ: Phòng Chiếu 1"
                    value={form.hallName}
                    onChange={(e) => setForm(prev => ({ ...prev, hallName: e.target.value }))}
                  />

                  <div className="flex flex-col gap-1.5 text-xs font-semibold">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">Loại Phòng</span>
                    <select
                      value={form.hallTypeId}
                      onChange={(e) => setForm(prev => ({ ...prev, hallTypeId: parseInt(e.target.value) }))}
                      className="w-full px-3 py-3 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold cursor-pointer"
                    >
                      <option value={0} disabled>Chọn loại phòng</option>
                      {hallTypesList.map((t) => (
                        <option key={t.hallTypeId} value={t.hallTypeId}>{t.typeName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto Generated: Mã Phòng & Sức Chứa (as premium statistics cards) */}
                <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Mã Phòng (Tự động)</span>
                    <span className="text-xs font-mono font-black text-brand-gold uppercase tracking-widest mt-0.5">
                      {form.hallCode || 'Chưa tạo'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-left border-l border-white/5 pl-4">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Sức Chứa (Tự động)</span>
                    <span className="text-xs font-mono font-black text-emerald-400 mt-0.5">
                      {form.capacity} ghế
                    </span>
                  </div>
                </div>

                {/* Supported Formats (premium modern tags/chips) */}
                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">Định Dạng Hỗ Trợ</span>
                  <div className="flex flex-wrap gap-2 bg-[#121216] p-3 rounded-xl border border-white/5">
                    {movieFormatsList.map((fmt) => {
                      const formatName = fmt.formatName;
                      const isChecked = form.supportedFormats.includes(formatName);
                      return (
                        <button
                          key={formatName}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setForm(prev => ({
                                ...prev,
                                supportedFormats: prev.supportedFormats.filter(f => f !== formatName)
                              }));
                            } else {
                              setForm(prev => ({
                                ...prev,
                                supportedFormats: [...prev.supportedFormats, formatName]
                              }));
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-brand/10 border-brand text-white shadow-md shadow-brand/10'
                              : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                          }`}
                        >
                          {formatName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">Mô Tả</span>
                  <textarea
                    placeholder="Nhập mô tả về cấu hình phòng chiếu (màn hình, âm thanh...)"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold h-20 resize-none"
                  />
                </div>

                {/* Status Selection */}
                <div className="flex flex-col gap-1.5 text-xs font-semibold">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">Trạng Thái Vận Hành</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-3 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold cursor-pointer"
                  >
                    <option value="Active">Hoạt Động (Active)</option>
                    <option value="Maintenance">Bảo Trì (Maintenance)</option>
                    <option value="Inactive">Ngưng Hoạt Động (Inactive)</option>
                  </select>
                </div>

                {/* Submit buttons */}
                <div className="flex gap-4 mt-2 font-bold text-xs uppercase">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" fullWidth className="shadow-brand bg-[#e50914] hover:bg-[#b80710] font-black" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu Phòng Chiếu'}
                  </Button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteOpen && hallToDelete && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121217] border border-white/10 rounded-3xl p-6 w-full max-w-md text-left flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="h-10 w-10 bg-brand/10 border border-brand/20 text-brand rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Xác Nhận Xóa Phòng</h3>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mã phòng: {hallToDelete.hallCode}</span>
                </div>
              </div>

              {checkingRelations ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 text-brand animate-spin" />
                  <span className="text-[10px] text-gray-500 font-black uppercase">Đang kiểm tra ràng buộc...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 font-semibold text-xs leading-relaxed text-gray-300">
                  <p>
                    Bạn có chắc chắn muốn xóa phòng <strong className="text-white font-black">{hallToDelete.hallName}</strong> của rạp <strong className="text-white font-black">{hallToDelete.cinemaName}</strong> không?
                  </p>

                  {/* Warning Alerts for Associated seats */}
                  {associatedSeatsCount > 0 && (
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 text-yellow-400 rounded-xl flex items-start gap-2.5">
                      <Users size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[10px] uppercase font-black tracking-wider">Cảnh báo Ghế ngồi</strong>
                        <span className="text-[11px] block mt-0.5">Phòng chiếu đang liên kết với <strong>{associatedSeatsCount} ghế ngồi</strong>. Việc xóa phòng sẽ làm ẩn toàn bộ các ghế này.</span>
                      </div>
                    </div>
                  )}

                  {/* Danger Alert for Future showtimes */}
                  {associatedShowtimesCount > 0 ? (
                    <div className="p-3 bg-brand/5 border border-brand/10 text-brand rounded-xl flex items-start gap-2.5">
                      <XCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[10px] uppercase font-black tracking-wider">Cảnh báo Suất chiếu ({associatedShowtimesCount})</strong>
                        <span className="text-[11px] block mt-0.5">Đã tìm thấy <strong>{associatedShowtimesCount} suất chiếu tương lai</strong> được lên lịch trong phòng này. Bạn <strong>không được phép</strong> xóa phòng chiếu cho đến khi các suất chiếu này được dời hoặc hủy bỏ.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[10px] uppercase font-black tracking-wider">Không có lịch chiếu</strong>
                        <span className="text-[11px] block mt-0.5">Phòng chiếu không có suất chiếu tương lai nào. Xóa phòng an toàn.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 w-full mt-4 font-bold text-xs uppercase">
                <Button variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={checkingRelations || associatedShowtimesCount > 0}
                  onClick={handleDeleteConfirm}
                  className="bg-brand hover:bg-brand/90 font-black flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} /> Đồng ý xóa
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
