import React, { useState, useEffect, useMemo } from 'react';
import {
  ConfigProvider,
  theme,
  Table,
  Tag,
  Switch,
  Button as AntButton,
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Input,
  Space,
  Popconfirm
} from 'antd';
import {
  Plus,
  Search,
  Trash2,
  Edit,
  DollarSign,
  Calendar,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Award
} from 'lucide-react';
import dayjs from 'dayjs';
import { useToast } from '../../contexts/ToastContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { apiClient } from '../../api/client';

const { Option } = Select;

export interface TicketPrice {
  id: number;
  seatType: string;  // Standard, VIP, Couple, Sweetbox
  roomType: string;  // 2D, 3D, IMAX, 4DX
  dayType: string;   // Weekday, Weekend, Holiday
  timeSlot: string;  // Morning, Afternoon, Evening, LateNight
  price: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

const mapBackendToFrontend = (item: any): TicketPrice => {
  let seatType = 'Standard';
  let roomType = '2D';
  let dayType = 'Weekday';
  let timeSlot = 'Afternoon';
  let effectiveFrom = '2026-01-01';
  let effectiveTo: string | undefined = undefined;
  let isActive = true;

  if (item.ticketType) {
    try {
      const meta = JSON.parse(item.ticketType);
      seatType = meta.seatType || seatType;
      roomType = meta.roomType || roomType;
      dayType = meta.dayType || dayType;
      timeSlot = meta.timeSlot || timeSlot;
      effectiveFrom = meta.effectiveFrom || effectiveFrom;
      effectiveTo = meta.effectiveTo;
      isActive = meta.isActive !== undefined ? meta.isActive : isActive;
    } catch {
      const typeStr = item.ticketType.toLowerCase();
      if (typeStr.includes('vip')) seatType = 'VIP';
      else if (typeStr.includes('couple')) seatType = 'Couple';
      else if (typeStr.includes('sweetbox')) seatType = 'Sweetbox';

      if (typeStr.includes('weekend')) dayType = 'Weekend';
      else if (typeStr.includes('holiday')) dayType = 'Holiday';

      if (typeStr.includes('imax')) roomType = 'IMAX';
      else if (typeStr.includes('4dx')) roomType = '4DX';
      else if (typeStr.includes('3d')) roomType = '3D';
    }
  }

  return {
    id: item.priceId,
    seatType,
    roomType,
    dayType,
    timeSlot,
    price: item.value,
    effectiveFrom,
    effectiveTo,
    isActive,
  };
};

const mapFrontendToBackend = (price: Partial<TicketPrice>) => {
  const metadata = {
    seatType: price.seatType,
    roomType: price.roomType,
    dayType: price.dayType,
    timeSlot: price.timeSlot,
    effectiveFrom: price.effectiveFrom,
    effectiveTo: price.effectiveTo,
    isActive: price.isActive,
  };
  return {
    value: price.price,
    ticketType: JSON.stringify(metadata),
  };
};

const AnimatedNumber: React.FC<{ value: number; formatter?: (val: number) => string }> = ({ value, formatter }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800; // 800ms animation
    const steps = 40;
    const stepValue = value / steps;
    const intervalTime = duration / steps;

    const timer = setInterval(() => {
      start += stepValue;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{formatter ? formatter(displayValue) : displayValue}</span>;
};

export const TicketPricesManagement: React.FC = () => {
  const { showToast } = useToast();
  const [prices, setPrices] = useState<TicketPrice[]>([]);
  const [loading, setLoading] = useState(false);

  // Form & Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<TicketPrice | null>(null);
  const [form] = Form.useForm();

  // Search & Filter states
  const [searchText, setSearchText] = useState('');
  const [filterSeat, setFilterSeat] = useState<string>('ALL');
  const [filterRoom, setFilterRoom] = useState<string>('ALL');
  const [filterDay, setFilterDay] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dynamic Seat Types and Hall/Room Types from source database/API
  const [dbSeatTypes, setDbSeatTypes] = useState<{ id: number; name: string }[]>([]);
  const [dbHallTypes, setDbHallTypes] = useState<{ id: number; name: string }[]>([]);

  const fetchMetadata = async () => {
    try {
      const [seatRes, hallRes] = await Promise.all([
        apiClient.get<any[]>('/seattypes'),
        apiClient.get<any[]>('/halltypes')
      ]);

      if (seatRes.data) {
        setDbSeatTypes(seatRes.data.map(s => ({ id: s.seatTypeId, name: s.typeName })));
      }
      if (hallRes.data) {
        setDbHallTypes(hallRes.data.map(h => ({ id: h.hallTypeId, name: h.typeName })));
      }
    } catch (err) {
      console.error('Error fetching seat types or hall types metadata:', err);
      // Fallbacks if backend doesn't respond or fail
      setDbSeatTypes([
        { id: 1, name: 'Standard' },
        { id: 2, name: 'VIP' },
        { id: 3, name: 'Couple' },
        { id: 4, name: 'Sweetbox' }
      ]);
      setDbHallTypes([
        { id: 1, name: '2D' },
        { id: 2, name: '3D' },
        { id: 3, name: 'IMAX' },
        { id: 4, name: '4DX' }
      ]);
    }
  };

  // Load ticket prices on mount
  const fetchPrices = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any[]>('/prices');
      const data = response.data || [];
      const mapped = data.map(mapBackendToFrontend);
      setPrices(mapped);
    } catch (err) {
      console.error('Error fetching ticket prices:', err);
      showToast('Không thể tải danh sách giá vé từ máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    fetchMetadata();
  }, []);

  // Format currency helper
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace('₫', '₫')
      .trim();
  };

  // Dashboard Statistics computations
  const stats = useMemo(() => {
    const activePrices = prices.filter(p => p.isActive);
    const totalCount = prices.length;
    const activeCount = activePrices.length;

    if (prices.length === 0) {
      return { totalCount, activeCount, min: 0, max: 0, avg: 0 };
    }

    const priceValues = prices.map(p => p.price);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const avg = Math.round(priceValues.reduce((sum, p) => sum + p, 0) / prices.length);

    return { totalCount, activeCount, min, max, avg };
  }, [prices]);

  // Handle Toggle Switch Activation
  const handleToggleActive = async (id: number, checked: boolean) => {
    const config = prices.find(p => p.id === id);
    if (!config) return;

    try {
      const updatedConfig = { ...config, isActive: checked };
      const payload = mapFrontendToBackend(updatedConfig);
      await apiClient.put(`/prices/${id}`, payload);

      setPrices(prev => prev.map(p => p.id === id ? updatedConfig : p));
      showToast(
        `Đã ${checked ? 'kích hoạt' : 'vô hiệu hóa'} cấu hình giá vé thành công.`,
        checked ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Error toggling price status:', err);
      showToast('Không thể cập nhật trạng thái giá vé.', 'error');
    }
  };

  // Open modal for editing or creating
  const handleOpenModal = (priceConfig?: TicketPrice) => {
    if (priceConfig) {
      setEditingPrice(priceConfig);
      form.setFieldsValue({
        ...priceConfig,
        effectiveFrom: dayjs(priceConfig.effectiveFrom),
        effectiveTo: priceConfig.effectiveTo ? dayjs(priceConfig.effectiveTo) : undefined,
      });
    } else {
      setEditingPrice(null);
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        effectiveFrom: dayjs(),
      });
    }
    setIsModalOpen(true);
  };

  // Form submission
  const handleFormSubmit = async (values: any) => {
    const payloadData: Partial<TicketPrice> = {
      seatType: values.seatType,
      roomType: values.roomType,
      dayType: values.dayType,
      timeSlot: values.timeSlot,
      price: values.price,
      effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
      effectiveTo: values.effectiveTo ? values.effectiveTo.format('YYYY-MM-DD') : undefined,
      isActive: values.isActive,
    };

    const backendPayload = mapFrontendToBackend(payloadData);

    try {
      if (editingPrice) {
        await apiClient.put(`/prices/${editingPrice.id}`, backendPayload);
        showToast('Cập nhật cấu hình giá vé thành công!', 'success');
      } else {
        await apiClient.post('/prices', backendPayload);
        showToast('Tạo cấu hình giá vé mới thành công!', 'success');
      }
      fetchPrices();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving price config:', err);
      showToast('Không thể lưu cấu hình giá vé.', 'error');
    }
  };

  // Delete configuration (Soft/Hard delete representation)
  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/prices/${id}`);
      setPrices(prev => prev.filter(p => p.id !== id));
      showToast('Đã xóa cấu hình giá vé thành công.', 'success');
    } catch (err: any) {
      console.error('Error deleting price config:', err);
      const msg = err.response?.data?.message || 'Không thể xóa cấu hình giá vé.';
      showToast(msg, 'error');
    }
  };

  // Filtered prices computing
  const filteredPrices = useMemo(() => {
    return prices.filter(p => {
      const matchSearch =
        p.seatType.toLowerCase().includes(searchText.toLowerCase()) ||
        p.roomType.toLowerCase().includes(searchText.toLowerCase()) ||
        p.dayType.toLowerCase().includes(searchText.toLowerCase()) ||
        p.timeSlot.toLowerCase().includes(searchText.toLowerCase());

      const matchSeat = filterSeat === 'ALL' || p.seatType === filterSeat;
      const matchRoom = filterRoom === 'ALL' || p.roomType === filterRoom;
      const matchDay = filterDay === 'ALL' || p.dayType === filterDay;
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && p.isActive) ||
        (filterStatus === 'INACTIVE' && !p.isActive);

      return matchSearch && matchSeat && matchRoom && matchDay && matchStatus;
    });
  }, [prices, searchText, filterSeat, filterRoom, filterDay, filterStatus]);

  // Reset filter configs
  const handleResetFilters = () => {
    setSearchText('');
    setFilterSeat('ALL');
    setFilterRoom('ALL');
    setFilterDay('ALL');
    setFilterStatus('ALL');
    showToast('Đã đặt lại tất cả bộ lọc.', 'info');
  };

  // Badge Colors styling mapping
  const getSeatBadgeColor = (type: string) => {
    switch (type) {
      case 'Standard': return '#4B5563'; // Gray
      case 'VIP': return '#8B5CF6';      // Purple
      case 'Couple': return '#EC4899';   // Pink
      case 'Sweetbox': return '#D97706'; // Gold
      default: return '#6B7280';
    }
  };

  const getDayBadgeColor = (type: string) => {
    switch (type) {
      case 'Weekday': return '#3B82F6';  // Blue
      case 'Weekend': return '#F59E0B';  // Orange
      case 'Holiday': return '#EF4444';  // Red
      default: return '#10B981';
    }
  };

  // Ant Design Table Columns Config
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: number) => <span className="font-mono text-gray-500 font-bold">#{String(id).slice(-4)}</span>,
      sorter: (a: TicketPrice, b: TicketPrice) => a.id - b.id,
    },
    {
      title: 'Loại Ghế',
      dataIndex: 'seatType',
      key: 'seatType',
      render: (type: string) => (
        <span
          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border"
          style={{
            color: getSeatBadgeColor(type),
            borderColor: `${getSeatBadgeColor(type)}30`,
            backgroundColor: `${getSeatBadgeColor(type)}10`
          }}
        >
          {type}
        </span>
      ),
      sorter: (a: TicketPrice, b: TicketPrice) => a.seatType.localeCompare(b.seatType),
    },
    {
      title: 'Loại Phòng',
      dataIndex: 'roomType',
      key: 'roomType',
      render: (type: string) => (
        <Tag color="cyan" className="font-bold border-cyan-500/25 bg-cyan-950/10 text-cyan-400">
          {type}
        </Tag>
      ),
      sorter: (a: TicketPrice, b: TicketPrice) => a.roomType.localeCompare(b.roomType),
    },
    {
      title: 'Loại Ngày',
      dataIndex: 'dayType',
      key: 'dayType',
      render: (type: string) => (
        <span
          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border"
          style={{
            color: getDayBadgeColor(type),
            borderColor: `${getDayBadgeColor(type)}30`,
            backgroundColor: `${getDayBadgeColor(type)}10`
          }}
        >
          {type}
        </span>
      ),
      sorter: (a: TicketPrice, b: TicketPrice) => a.dayType.localeCompare(b.dayType),
    },
    {
      title: 'Khung Giờ',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      render: (slot: string) => (
        <span className="text-gray-300 font-semibold text-xs flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gold"></span>
          {slot}
        </span>
      ),
    },
    {
      title: 'Giá Vé',
      dataIndex: 'price',
      key: 'price',
      render: (val: number) => (
        <span className="text-white font-mono font-black text-[13px] bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/5 shadow-md shadow-black/10">
          {formatVND(val)}
        </span>
      ),
      sorter: (a: TicketPrice, b: TicketPrice) => a.price - b.price,
    },
    {
      title: 'Hiệu Lực',
      key: 'validity',
      render: (record: TicketPrice) => (
        <div className="flex flex-col gap-0.5 text-[10px] font-semibold text-gray-500">
          <div>Từ: <span className="text-gray-300 font-mono">{record.effectiveFrom}</span></div>
          {record.effectiveTo && (
            <div>Đến: <span className="text-gray-300 font-mono">{record.effectiveTo}</span></div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: TicketPrice) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleActive(record.id, checked)}
          className="custom-switch-red"
        />
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      align: 'right' as const,
      render: (record: TicketPrice) => (
        <Space size="middle">
          <AntButton
            type="text"
            icon={<Edit size={14} className="text-blue-400 group-hover:text-blue-300" />}
            onClick={() => handleOpenModal(record)}
            className="flex items-center justify-center p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors group cursor-pointer"
          />
          <Popconfirm
            title="Xóa cấu hình giá vé này?"
            description="Lưu ý: Thao tác này sẽ gỡ bỏ giá vé vĩnh viễn khỏi danh sách."
            onConfirm={() => handleDelete(record.id)}
            okText="Xác nhận"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <AntButton
              type="text"
              icon={<Trash2 size={14} className="text-brand group-hover:text-red-400" />}
              className="flex items-center justify-center p-2 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/20 transition-colors group cursor-pointer"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#FF2D2D',
          colorBgBase: '#05070F',
          colorBgContainer: '#0D111C',
          borderRadius: 16,
          colorBorder: 'rgba(255, 255, 255, 0.05)',
        },
        components: {
          Table: {
            headerBg: 'rgba(255, 255, 255, 0.02)',
            headerColor: '#9CA3AF',
            rowHoverBg: 'rgba(255, 255, 255, 0.01)',
          },
          Modal: {
            contentBg: '#0E1322',
            headerBg: '#0E1322',
          }
        }
      }}
    >
      <div className="flex flex-col gap-6 animate-fadeIn w-full text-left text-gray-200">

        {/* Header Title with Glowing Accents */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-black uppercase tracking-widest text-[#FFD54A] flex items-center gap-2">
              <Award size={18} className="text-[#FF2D2D]" /> Cấu Hình Giá Vé
            </h3>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Thiết lập khung giá vé nâng cao, tùy biến linh hoạt theo loại ghế, loại phòng chiếu, thời điểm chiếu và ngày nghỉ lễ
            </span>
          </div>

          <AntButton
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => handleOpenModal()}
            className="bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 border-0 flex items-center gap-1.5 px-5 py-5 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Tạo cấu hình giá
          </AntButton>
        </div>

        {/* Premium Dashboard Counter Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <GlassCard className="p-5 border border-white/5 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#FF2D2D]/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Tổng cấu hình</span>
              <span className="text-2xl font-black text-white font-mono">
                <AnimatedNumber value={stats.totalCount} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                Đang kích hoạt: {stats.activeCount}
              </span>
            </div>
            <div className="p-3.5 bg-[#FF2D2D]/10 border border-[#FF2D2D]/20 text-[#FF2D2D] rounded-2xl shadow-inner z-10">
              <Sparkles size={16} />
            </div>
          </GlassCard>

          <GlassCard className="p-5 border border-white/5 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Giá Vé Thấp Nhất</span>
              <span className="text-2xl font-black text-blue-400 font-mono">
                <AnimatedNumber value={stats.min} formatter={formatVND} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Tiêu chuẩn rạp 2D</span>
            </div>
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl shadow-inner z-10">
              <TrendingDown size={16} />
            </div>
          </GlassCard>

          <GlassCard className="p-5 border border-white/5 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#FFD54A]/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Giá Vé Cao Nhất</span>
              <span className="text-2xl font-black text-[#FFD54A] font-mono">
                <AnimatedNumber value={stats.max} formatter={formatVND} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Phòng chiếu IMAX/4DX</span>
            </div>
            <div className="p-3.5 bg-[#FFD54A]/10 border border-[#FFD54A]/20 text-[#FFD54A] rounded-2xl shadow-inner z-10">
              <TrendingUp size={16} />
            </div>
          </GlassCard>

          <GlassCard className="p-5 border border-white/5 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Giá Trung Bình</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                <AnimatedNumber value={stats.avg} formatter={formatVND} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Toàn hệ thống rạp</span>
            </div>
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner z-10">
              <DollarSign size={16} />
            </div>
          </GlassCard>
        </div>

        {/* Advanced Filters Panel */}
        <GlassCard className="p-4 border border-white/5 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Quick Search */}
            <div className="relative w-full md:w-60">
              <Input
                placeholder="Tìm loại ghế, phòng chiếu..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<Search size={14} className="text-gray-500 mr-1" />}
                className="w-full bg-white/[0.02] border-white/5 hover:border-white/10 focus:border-red-500 rounded-xl py-2 text-xs"
              />
            </div>

            {/* Filter Seat Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase text-gray-500 font-bold shrink-0">Loại ghế:</span>
              <Select
                value={filterSeat}
                onChange={setFilterSeat}
                className="custom-antd-select w-28 text-xs"
                classNames={{
                  popup: {
                    root: 'custom-antd-select-dropdown'
                  }
                }}
              >
                <Option value="ALL">Tất cả</Option>
                {dbSeatTypes.map(s => (
                  <Option key={s.id} value={s.name}>{s.name}</Option>
                ))}
              </Select>
            </div>

            {/* Filter Room Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase text-gray-500 font-bold shrink-0">Phòng chiếu:</span>
              <Select
                value={filterRoom}
                onChange={setFilterRoom}
                className="custom-antd-select w-28 text-xs"
              >
                <Option value="ALL">Tất cả</Option>
                {dbHallTypes.map(h => (
                  <Option key={h.id} value={h.name}>{h.name}</Option>
                ))}
              </Select>
            </div>

            {/* Filter Day Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase text-gray-500 font-bold shrink-0">Ngày:</span>
              <Select
                value={filterDay}
                onChange={setFilterDay}
                className="custom-antd-select w-28 text-xs"
              >
                <Option value="ALL">Tất cả</Option>
                <Option value="Weekday">Weekday</Option>
                <Option value="Weekend">Weekend</Option>
                <Option value="Holiday">Holiday</Option>
              </Select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase text-gray-500 font-bold shrink-0">Trạng thái:</span>
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                className="custom-antd-select w-28 text-xs"
              >
                <Option value="ALL">Tất cả</Option>
                <Option value="ACTIVE">Active</Option>
                <Option value="INACTIVE">Inactive</Option>
              </Select>
            </div>
          </div>

          <AntButton
            onClick={handleResetFilters}
            icon={<RotateCcw size={12} />}
            className="w-full md:w-auto bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-0 flex items-center justify-center gap-1.5 px-4 py-4 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
          >
            Đặt lại bộ lọc
          </AntButton>
        </GlassCard>

        {/* Ant Design Modern Table list */}
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
          <Table
            columns={columns}
            dataSource={filteredPrices}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 6,
              showSizeChanger: false,
              className: "custom-table-pagination font-mono font-semibold text-xs px-4",
            }}
            className="custom-table"
          />
        </div>

        {/* Creation & Editing Config Modal Form */}
        <Modal
          title={
            <div className="text-sm font-black uppercase tracking-widest text-[#FFD54A] flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Calendar size={16} className="text-[#FF2D2D]" />
              {editingPrice ? 'Chỉnh Sửa Giá Vé' : 'Tạo Mới Giá Vé'}
            </div>
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={520}
          centered
          className="ticket-price-modal"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
            className="pt-4 font-semibold text-xs"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Seat Type Select */}
              <Form.Item
                name="seatType"
                label="Loại Ghế"
                rules={[{ required: true, message: 'Vui lòng chọn loại ghế!' }]}
              >
                <Select placeholder="Chọn loại ghế" className="custom-antd-form-select">
                  {dbSeatTypes.map(s => (
                    <Option key={s.id} value={s.name}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Room Type Select */}
              <Form.Item
                name="roomType"
                label="Loại Phòng"
                rules={[{ required: true, message: 'Vui lòng chọn loại phòng!' }]}
              >
                <Select placeholder="Chọn loại phòng" className="custom-antd-form-select">
                  {dbHallTypes.map(h => (
                    <Option key={h.id} value={h.name}>{h.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Day Type Select */}
              <Form.Item
                name="dayType"
                label="Loại Ngày"
                rules={[{ required: true, message: 'Vui lòng chọn loại ngày!' }]}
              >
                <Select placeholder="Chọn loại ngày" className="custom-antd-form-select">
                  <Option value="Weekday">Weekday (Trong tuần)</Option>
                  <Option value="Weekend">Weekend (Cuối tuần)</Option>
                  <Option value="Holiday">Holiday (Ngày lễ tết)</Option>
                </Select>
              </Form.Item>

              {/* Time Slot Select */}
              <Form.Item
                name="timeSlot"
                label="Khung Giờ"
                rules={[{ required: true, message: 'Vui lòng chọn khung giờ!' }]}
              >
                <Select placeholder="Chọn khung giờ" className="custom-antd-form-select">
                  <Option value="Buổi sáng">Buổi sáng (6h - 12h)</Option>
                  <Option value="Buổi trưa">Buổi trưa (12h - 17h)</Option>
                  <Option value="Buổi tối">Buổi tối (17h - 22h)</Option>
                  <Option value="Suất chiếu muộn">Suất chiếu muộn (Sau 22h)</Option>
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Ticket Price Value */}
              <Form.Item
                name="price"
                label="Giá Vé (VND)"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá vé!' },
                  { type: 'number', min: 1000, message: 'Giá vé tối thiểu là 1.000 đ' }
                ]}
              >
                <InputNumber
                  className="w-full custom-antd-number-input font-mono text-white"
                  placeholder="Nhập giá vé bằng số (VND)"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(value) => value!.replace(/\$\s?|(\.*)/g, '') as any}
                />
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Validity Dates */}
              <Form.Item
                name="effectiveFrom"
                label="Hiệu Lực Từ"
                rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực!' }]}
              >
                <DatePicker className="w-full custom-antd-datepicker" format="YYYY-MM-DD" />
              </Form.Item>

              <Form.Item
                name="effectiveTo"
                label="Hết Hạn (Không bắt buộc)"
              >
                <DatePicker className="w-full custom-antd-datepicker" format="YYYY-MM-DD" />
              </Form.Item>
            </div>

            {/* Is Active Switcer */}
            <Form.Item
              name="isActive"
              label="Trạng Thái Hoạt Động"
              valuePropName="checked"
            >
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-3 rounded-2xl">
                <Switch className="custom-switch-red" />
                <span className="text-gray-400 text-[10px] uppercase font-black tracking-wider">
                  Kích hoạt cấu hình giá vé này cho các suất chiếu ngay lập tức
                </span>
              </div>
            </Form.Item>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-2">
              <AntButton
                onClick={() => setIsModalOpen(false)}
                className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-0 flex items-center justify-center px-5 py-4 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Hủy
              </AntButton>

              <AntButton
                type="primary"
                htmlType="submit"
                className="bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 border-0 flex items-center justify-center px-6 py-4 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-red-500/20"
              >
                {editingPrice ? 'Cập Nhật' : 'Tạo mới'}
              </AntButton>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};
