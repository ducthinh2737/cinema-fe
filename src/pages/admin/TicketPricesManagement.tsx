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
  Input,
  Space,
  Popconfirm,
  Tooltip
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
  Award,
  Layers,
  HelpCircle,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../contexts/ToastContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { apiClient } from '../../api/client';

const { Option } = Select;

export interface PricingRule {
  id: number;
  seatType: string;  // STANDARD, VIP, COUPLE, SWEETBOX, ALL
  hallType: string;  // STANDARD, VIP, IMAX, 4DX, ALL
  dayType: string;   // WEEKDAY, WEEKEND, HOLIDAY, ALL
  timeSlot: string;  // MORNING, AFTERNOON, EVENING, NIGHT, ALL
  basePrice: number;
  status: string;    // ACTIVE, INACTIVE
  priority: number;
  createdAt: string;
}

const AnimatedNumber: React.FC<{ value: number; formatter?: (val: number) => string }> = ({ value, formatter }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600; // 600ms animation
    const steps = 30;
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
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);

  // Form & Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [form] = Form.useForm();

  // Search & Filter states
  const [searchText, setSearchText] = useState('');
  const [filterSeat, setFilterSeat] = useState<string>('ALL');
  const [filterHall, setFilterHall] = useState<string>('ALL');
  const [filterDay, setFilterDay] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Filter Collapse state
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [dbSeatTypes, setDbSeatTypes] = useState<{ id: number; name: string }[]>([]);
  const [dbHallTypes, setDbHallTypes] = useState<{ id: number; name: string }[]>([]);

  // Load rules on mount
  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/pricing-rules');
      setRules(response.data?.data || []);
    } catch (err) {
      console.error('Error fetching pricing rules:', err);
      showToast('Không thể tải danh sách luật tính giá từ máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Error fetching metadata:', err);
    }
  };

  useEffect(() => {
    fetchRules();
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
    const activeRules = rules.filter(r => r.status === 'ACTIVE');
    const totalCount = rules.length;
    const activeCount = activeRules.length;

    const baselineRules = rules.filter(r => r.seatType === 'ALL' && r.hallType === 'ALL');

    if (baselineRules.length === 0) {
      return { totalCount, activeCount, min: 0, max: 0, avg: 0 };
    }

    const priceValues = baselineRules.map(r => r.basePrice);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const avg = Math.round(priceValues.reduce((sum, p) => sum + p, 0) / baselineRules.length);

    return { totalCount, activeCount, min, max, avg };
  }, [rules]);

  // Handle Toggle Switch Activation
  const handleToggleActive = async (id: number, checked: boolean) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    try {
      const updatedStatus = checked ? 'ACTIVE' : 'INACTIVE';
      const payload = {
        seatType: rule.seatType,
        hallType: rule.hallType,
        dayType: rule.dayType,
        timeSlot: rule.timeSlot,
        basePrice: rule.basePrice,
        status: updatedStatus,
        priority: rule.priority
      };
      await apiClient.put(`/pricing-rules/${id}`, payload);

      setRules(prev => prev.map(r => r.id === id ? { ...r, status: updatedStatus } : r));
      showToast(
        `Đã ${checked ? 'kích hoạt' : 'vô hiệu hóa'} luật tính giá thành công.`,
        checked ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Error toggling rule status:', err);
      showToast('Không thể cập nhật trạng thái luật tính giá.', 'error');
    }
  };

  // Open modal for editing or creating
  const handleOpenModal = (rule?: PricingRule) => {
    if (rule) {
      setEditingRule(rule);
      form.setFieldsValue({
        ...rule
      });
    } else {
      setEditingRule(null);
      form.resetFields();
      form.setFieldsValue({
        seatType: 'ALL',
        hallType: 'ALL',
        dayType: 'ALL',
        timeSlot: 'ALL',
        status: 'ACTIVE',
        priority: 1,
        basePrice: 80000
      });
    }
    setIsModalOpen(true);
  };

  // Form submission
  const handleFormSubmit = async (values: any) => {
    const payload = {
      seatType: values.seatType,
      hallType: values.hallType,
      dayType: values.dayType,
      timeSlot: values.timeSlot,
      basePrice: values.basePrice,
      status: values.status,
      priority: values.priority
    };

    try {
      if (editingRule) {
        await apiClient.put(`/pricing-rules/${editingRule.id}`, payload);
        showToast('Cập nhật luật tính giá thành công!', 'success');
      } else {
        await apiClient.post('/pricing-rules', payload);
        showToast('Tạo luật tính giá mới thành công!', 'success');
      }
      fetchRules();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving pricing rule:', err);
      showToast('Không thể lưu luật tính giá.', 'error');
    }
  };

  // Delete rule
  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/pricing-rules/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
      showToast('Đã xóa luật tính giá thành công.', 'success');
    } catch (err: any) {
      console.error('Error deleting pricing rule:', err);
      const msg = err.response?.data?.message || 'Không thể xóa luật tính giá.';
      showToast(msg, 'error');
    }
  };

  // Filtered rules computing
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchSearch =
        r.seatType.toLowerCase().includes(searchText.toLowerCase()) ||
        r.hallType.toLowerCase().includes(searchText.toLowerCase()) ||
        r.dayType.toLowerCase().includes(searchText.toLowerCase()) ||
        r.timeSlot.toLowerCase().includes(searchText.toLowerCase());

      const matchSeat = filterSeat === 'ALL' || r.seatType === filterSeat;
      const matchHall = filterHall === 'ALL' || r.hallType === filterHall;
      const matchDay = filterDay === 'ALL' || r.dayType === filterDay;
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && r.status === 'ACTIVE') ||
        (filterStatus === 'INACTIVE' && r.status === 'INACTIVE');

      return matchSearch && matchSeat && matchHall && matchDay && matchStatus;
    });
  }, [rules, searchText, filterSeat, filterHall, filterDay, filterStatus]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchText !== '') count++;
    if (filterSeat !== 'ALL') count++;
    if (filterHall !== 'ALL') count++;
    if (filterDay !== 'ALL') count++;
    if (filterStatus !== 'ALL') count++;
    return count;
  }, [searchText, filterSeat, filterHall, filterDay, filterStatus]);

  const handleResetFilters = () => {
    setSearchText('');
    setFilterSeat('ALL');
    setFilterHall('ALL');
    setFilterDay('ALL');
    setFilterStatus('ALL');
    showToast('Đã đặt lại tất cả bộ lọc.', 'info');
  };

  // Badge Colors styling mapping
  const getSeatBadgeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ALL': return '#10B981';      // Emerald Green
      case 'STANDARD': return '#9CA3AF'; // Gray
      case 'VIP': return '#8B5CF6';      // Purple
      case 'COUPLE': return '#EC4899';   // Pink
      case 'SWEETBOX': return '#F59E0B'; // Amber Gold
      default: return '#6B7280';
    }
  };

  const getDayBadgeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ALL': return '#10B981';
      case 'WEEKDAY': return '#3B82F6';  // Blue
      case 'WEEKEND': return '#F59E0B';  // Orange
      case 'HOLIDAY': return '#EF4444';  // Red
      default: return '#6B7280';
    }
  };

  // Live Watch modal values for interactive Preview box
  const watchSeatType = Form.useWatch('seatType', form) || 'ALL';
  const watchHallType = Form.useWatch('hallType', form) || 'ALL';
  const watchBasePrice = Form.useWatch('basePrice', form) || 0;

  const previewSemantic = useMemo(() => {
    const isBaseline = watchSeatType === 'ALL' && watchHallType === 'ALL';
    if (isBaseline) {
      return {
        type: 'baseline',
        title: 'Quy Tắc Giá Vé Nền',
        desc: `Luật này thiết lập mức giá vé cơ sở là ${formatVND(watchBasePrice)} cho tất cả các loại ghế và phòng chiếu thỏa mãn điều kiện ngày/giờ chiếu.`,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      };
    } else if (watchSeatType !== 'ALL' && watchHallType === 'ALL') {
      return {
        type: 'seat_surcharge',
        title: 'Quy Tắc Phụ Thu Ghế',
        desc: `Luật này quy định phụ thu thêm ${formatVND(watchBasePrice)} vào giá vé cuối cùng khi khách hàng chọn loại ghế [${watchSeatType}].`,
        colorClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20'
      };
    } else if (watchHallType !== 'ALL' && watchSeatType === 'ALL') {
      return {
        type: 'hall_surcharge',
        title: 'Quy Tắc Phụ Thu Phòng',
        desc: `Luật này quy định phụ thu thêm ${formatVND(watchBasePrice)} vào giá vé cuối cùng cho các suất chiếu diễn ra tại phòng loại [${watchHallType}].`,
        colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      };
    } else {
      return {
        type: 'combo_surcharge',
        title: 'Quy Tắc Tổ Hợp Đặc Biệt',
        desc: `Luật này quy định phụ thu ${formatVND(watchBasePrice)} trọn gói khi khách hàng đồng thời chọn ghế [${watchSeatType}] trong phòng chiếu [${watchHallType}] (Ví dụ: Ghế VIP trong phòng IMAX).`,
        colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      };
    }
  }, [watchSeatType, watchHallType, watchBasePrice]);

  const seatOptionsList = useMemo(() => {
    if (dbSeatTypes.length > 0) return dbSeatTypes;
    return [
      { id: 1, name: 'STANDARD' },
      { id: 2, name: 'VIP' },
      { id: 4, name: 'COUPLE' }
    ];
  }, [dbSeatTypes]);

  const hallOptionsList = useMemo(() => {
    if (dbHallTypes.length > 0) return dbHallTypes;
    return [
      { id: 1, name: 'STANDARD' },
      { id: 2, name: 'VIP' },
      { id: 3, name: 'IMAX' }
    ];
  }, [dbHallTypes]);

  // Ant Design Table Columns Config
  const columns = [
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: number) => {
        let colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (priority >= 4 && priority <= 6) {
          colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        } else if (priority >= 7) {
          colorClass = 'text-red-400 bg-red-500/10 border-red-500/20';
        }
        return (
          <span className={`font-mono font-black border px-2.5 py-0.5 rounded-lg flex items-center gap-1 w-fit text-[11px] ${colorClass}`}>
            <Layers size={10} />
            P{priority}
          </span>
        );
      },
      sorter: (a: PricingRule, b: PricingRule) => a.priority - b.priority,
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
          {type === 'ALL' ? 'Tất cả ghế' : type}
        </span>
      ),
      sorter: (a: PricingRule, b: PricingRule) => a.seatType.localeCompare(b.seatType),
    },
    {
      title: 'Loại Phòng',
      dataIndex: 'hallType',
      key: 'hallType',
      render: (type: string) => (
        <Tag color={type === 'ALL' ? 'green' : 'cyan'} className="font-bold border-cyan-500/25 bg-cyan-950/10 text-cyan-400">
          {type === 'ALL' ? 'Tất cả phòng' : type}
        </Tag>
      ),
      sorter: (a: PricingRule, b: PricingRule) => a.hallType.localeCompare(b.hallType),
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
          {type === 'ALL' ? 'Tất cả ngày' : type}
        </span>
      ),
      sorter: (a: PricingRule, b: PricingRule) => a.dayType.localeCompare(b.dayType),
    },
    {
      title: 'Khung Giờ',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      render: (slot: string) => (
        <span className="text-gray-300 font-semibold text-xs flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gold"></span>
          {slot === 'ALL' ? 'Mọi khung giờ' : slot}
        </span>
      ),
    },
    {
      title: 'Giá Vé / Phụ Thu',
      key: 'basePrice',
      render: (_: any, record: PricingRule) => {
        const isBaseline = record.seatType === 'ALL' && record.hallType === 'ALL';
        const labelText = isBaseline ? 'Giá nền' : 'Phụ thu';
        const badgeColor = isBaseline ? 'warning' : 'magenta';

        return (
          <Tooltip title={isBaseline ? "Giá vé cơ sở áp dụng cho khung giờ/ngày này" : "Mức giá phụ thu cộng thêm cho loại ghế/phòng này"}>
            <div className="flex items-center gap-2">
              <span className="text-[#FFD54A] font-mono font-black text-[13px] bg-[#FFD54A]/5 px-2.5 py-1 rounded-xl border border-[#FFD54A]/20 shadow-md shadow-yellow-500/5 cursor-help">
                {formatVND(record.basePrice)}
              </span>
              <Tag color={badgeColor} className="text-[10px] font-bold px-1.5 py-0.5 rounded border-0">
                {labelText}
              </Tag>
            </div>
          </Tooltip>
        );
      },
      sorter: (a: PricingRule, b: PricingRule) => a.basePrice - b.basePrice,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: PricingRule) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={status === 'ACTIVE'}
            onChange={(checked) => handleToggleActive(record.id, checked)}
            size="small"
            className="custom-switch-red"
          />
          <span className={`text-[10px] font-bold tracking-wider flex items-center gap-1 ${status === 'ACTIVE' ? 'text-emerald-400' : 'text-gray-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
            {status}
          </span>
        </div>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      align: 'right' as const,
      render: (record: PricingRule) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa luật">
            <AntButton
              type="text"
              icon={<Edit size={14} className="text-blue-400" />}
              onClick={() => handleOpenModal(record)}
              className="flex items-center justify-center p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all hover:scale-[1.05] active:scale-[0.95] cursor-pointer"
            />
          </Tooltip>
          <Popconfirm
            title="Xóa luật tính giá này?"
            description="Lưu ý: Luật này sẽ ảnh hưởng vĩnh viễn tới logic tính giá vé."
            onConfirm={() => handleDelete(record.id)}
            okText="Xác nhận"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa luật">
              <AntButton
                type="text"
                icon={<Trash2 size={14} className="text-[#FF2D2D]" />}
                className="flex items-center justify-center p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-[#FF2D2D]/20 transition-all hover:scale-[1.05] active:scale-[0.95] cursor-pointer"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const customLocale = {
    emptyText: (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 text-gray-500 mb-3">
          <Layers size={24} className="opacity-40" />
        </div>
        <h3 className="text-sm font-bold text-gray-400">Không tìm thấy luật tính giá nào</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          Hãy thử điều chỉnh bộ lọc hoặc tạo một luật tính giá vé mới.
        </p>
      </div>
    )
  };

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

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-black uppercase tracking-widest text-[#FFD54A] flex items-center gap-2">
              <Award size={18} className="text-[#FF2D2D]" /> Pricing Engine Rules
            </h3>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Thiết lập các luật tính giá vé (Pricing Rules) nâng cao. Luật ưu tiên cao hơn sẽ ghi đè các luật cơ sở.
            </span>
          </div>

          <AntButton
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => handleOpenModal()}
            className="bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 border-0 flex items-center gap-1.5 px-5 py-5 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Tạo Luật Tính Giá
          </AntButton>
        </div>

        {/* Counters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <GlassCard className="p-4 border border-white/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-350">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#FF2D2D]/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Tổng số luật</span>
              <span className="text-xl font-black text-white font-mono">
                <AnimatedNumber value={stats.totalCount} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                Quy tắc cấu hình
              </span>
            </div>
            <div className="p-3 bg-[#FF2D2D]/10 border border-[#FF2D2D]/20 text-[#FF2D2D] rounded-2xl shadow-inner z-10">
              <Layers size={14} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-350">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Đang hoạt động</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                <AnimatedNumber value={stats.activeCount} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                Hiệu lực áp dụng
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner z-10">
              <Sparkles size={14} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-350">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Giá tối thiểu</span>
              <span className="text-xl font-black text-blue-400 font-mono">
                <AnimatedNumber value={stats.min} formatter={formatVND} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Giá vé nền thấp nhất</span>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl shadow-inner z-10">
              <TrendingDown size={14} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-500/5 transition-all duration-350">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#FFD54A]/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Giá tối đa</span>
              <span className="text-xl font-black text-[#FFD54A] font-mono">
                <AnimatedNumber value={stats.max} formatter={formatVND} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Giá vé nền cao nhất</span>
            </div>
            <div className="p-3 bg-[#FFD54A]/10 border border-[#FFD54A]/20 text-[#FFD54A] rounded-2xl shadow-inner z-10">
              <TrendingUp size={14} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-350">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col gap-1 z-10">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Giá trung bình</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                <AnimatedNumber value={stats.avg} formatter={formatVND} />
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Giá vé nền trung bình</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shadow-inner z-10">
              <DollarSign size={14} />
            </div>
          </GlassCard>
        </div>

        {/* Filter Panel (Collapsible) */}
        <GlassCard className="p-4 border border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs font-extrabold text-gray-300">Bộ lọc quy tắc</span>
              {activeFiltersCount > 0 && (
                <span className="bg-red-500/15 border border-red-500/30 text-[#FF2D2D] text-[10px] px-2 py-0.5 rounded-full font-black">
                  {activeFiltersCount} đang bật
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeFiltersCount > 0 && (
                <AntButton
                  type="text"
                  onClick={handleResetFilters}
                  icon={<RotateCcw size={12} />}
                  className="text-gray-400 hover:text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  Đặt lại
                </AntButton>
              )}
              <AntButton
                type="text"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="text-gray-400 hover:text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                {isFilterExpanded ? 'Thu gọn ▲' : 'Mở rộng ▼'}
              </AntButton>
            </div>
          </div>

          <AnimatePresence>
            {(isFilterExpanded || activeFiltersCount > 0) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-white/5">
                  <div className="relative">
                    <Input
                      placeholder="Tìm kiếm..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      prefix={<Search size={12} className="text-gray-500 mr-1" />}
                      className="w-full bg-white/[0.02] border-white/5 hover:border-white/10 focus:border-red-500 rounded-xl py-2 text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase text-gray-500 font-bold">Loại ghế:</span>
                    <Select value={filterSeat} onChange={setFilterSeat} className="custom-antd-select w-full text-xs">
                      <Option value="ALL">Tất cả</Option>
                      {seatOptionsList.map(s => (
                        <Option key={s.id} value={s.name.toUpperCase()}>{s.name.toUpperCase()}</Option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase text-gray-500 font-bold">Phòng chiếu:</span>
                    <Select value={filterHall} onChange={setFilterHall} className="custom-antd-select w-full text-xs">
                      <Option value="ALL">Tất cả</Option>
                      {hallOptionsList.map(h => (
                        <Option key={h.id} value={h.name.toUpperCase()}>{h.name.toUpperCase()}</Option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase text-gray-500 font-bold">Ngày chiếu:</span>
                    <Select value={filterDay} onChange={setFilterDay} className="custom-antd-select w-full text-xs">
                      <Option value="ALL">Tất cả</Option>
                      <Option value="WEEKDAY">WEEKDAY</Option>
                      <Option value="WEEKEND">WEEKEND</Option>
                      <Option value="HOLIDAY">HOLIDAY</Option>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase text-gray-500 font-bold">Trạng thái:</span>
                    <Select value={filterStatus} onChange={setFilterStatus} className="custom-antd-select w-full text-xs">
                      <Option value="ALL">Tất cả</Option>
                      <Option value="ACTIVE">ACTIVE</Option>
                      <Option value="INACTIVE">INACTIVE</Option>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Table View */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.01)]">
          <Table
            columns={columns}
            dataSource={filteredRules}
            rowKey="id"
            loading={loading}
            locale={customLocale}
            pagination={{
              pageSize: 6,
              showSizeChanger: false,
              className: "custom-table-pagination font-mono font-semibold text-xs px-4",
            }}
            className="custom-table"
          />
        </div>

        {/* Modal Form */}
        <Modal
          title={
            <div className="text-sm font-black uppercase tracking-widest text-[#FFD54A] flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Calendar size={16} className="text-[#FF2D2D]" />
              {editingRule ? 'Chỉnh Sửa Luật Tính Giá' : 'Tạo Mới Luật Tính Giá'}
            </div>
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={720}
          centered
          className="ticket-price-modal"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
            className="pt-4 font-semibold text-xs text-gray-300"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left Column: Context / Bối cảnh */}
              <div className="flex flex-col gap-4 md:border-r md:border-white/5 md:pr-6">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1 flex items-center gap-1">
                  <HelpCircle size={10} /> Bối cảnh áp dụng (Context)
                </span>

                <Form.Item name="seatType" label="Loại Ghế" rules={[{ required: true }]}>
                  <Select placeholder="Chọn loại ghế" className="custom-antd-form-select">
                    <Option value="ALL">Tất cả ghế (ALL)</Option>
                    {seatOptionsList.map(s => (
                      <Option key={s.id} value={s.name.toUpperCase()}>{s.name.toUpperCase()}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="hallType" label="Loại Phòng" rules={[{ required: true }]}>
                  <Select placeholder="Chọn loại phòng" className="custom-antd-form-select">
                    <Option value="ALL">Tất cả phòng (ALL)</Option>
                    {hallOptionsList.map(h => (
                      <Option key={h.id} value={h.name.toUpperCase()}>{h.name.toUpperCase()}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="dayType" label="Loại Ngày" rules={[{ required: true }]}>
                  <Select placeholder="Chọn loại ngày" className="custom-antd-form-select">
                    <Option value="ALL">Tất cả ngày (ALL)</Option>
                    <Option value="WEEKDAY">WEEKDAY (Trong tuần)</Option>
                    <Option value="WEEKEND">WEEKEND (Cuối tuần)</Option>
                    <Option value="HOLIDAY">HOLIDAY (Ngày lễ tết)</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="timeSlot" label="Khung Giờ" rules={[{ required: true }]}>
                  <Select placeholder="Chọn khung giờ" className="custom-antd-form-select">
                    <Option value="ALL">Mọi khung giờ (ALL)</Option>
                    <Option value="MORNING">MORNING (Sáng: 6h - 12h)</Option>
                    <Option value="AFTERNOON">AFTERNOON (Chiều: 12h - 17h)</Option>
                    <Option value="EVENING">EVENING (Tối: 17h - 22h)</Option>
                    <Option value="NIGHT">NIGHT (Đêm: Sau 22h)</Option>
                  </Select>
                </Form.Item>
              </div>

              {/* Right Column: Pricing Config */}
              <div className="flex flex-col gap-4">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1 flex items-center gap-1">
                  <DollarSign size={10} /> Cấu hình giá (Pricing config)
                </span>

                <Form.Item name="basePrice" label="Giá Vé Cơ Bản (VND)" rules={[{ required: true }]}>
                  <InputNumber
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => (value ? value.replace(/\$\s?|(,*)/g, '') : '') as any}
                    className="w-full bg-[#0a0c14] border-yellow-500/50 text-yellow-300 rounded-lg focus:outline-none shadow-[0_0_10px_rgba(253,224,71,0.15)] focus:shadow-[0_0_15px_rgba(253,224,71,0.25)] transition-all font-mono font-black"
                    min={1000}
                  />
                </Form.Item>

                <Form.Item
                  name="priority"
                  label="Độ Ưu Tiên (Priority)"
                  rules={[{ required: true }]}
                  extra={<span className="text-[10px] text-gray-500 font-bold block mt-1">💡 Số càng cao càng ưu tiên áp dụng trước.</span>}
                >
                  <InputNumber className="w-full bg-[#0a0c14] border-white/10 text-white rounded-lg focus:outline-none" min={1} />
                </Form.Item>

                <Form.Item
                  name="status"
                  label="Trạng Thái Hoạt Động"
                  valuePropName="checked"
                  getValueProps={(value) => ({ checked: value === 'ACTIVE' })}
                  normalize={(value) => value ? 'ACTIVE' : 'INACTIVE'}
                >
                  <div className="flex items-center gap-3 mt-1">
                    <Switch checkedChildren="ACTIVE" unCheckedChildren="INACTIVE" className="custom-switch-red" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Kích hoạt luật này ngay lập tức</span>
                  </div>
                </Form.Item>

                {/* Estimate Preview Box */}
                <div className="mt-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                      Ý nghĩa quy tắc tính giá:
                    </span>
                    <span className="text-[8px] bg-red-500/10 text-[#FF2D2D] px-1.5 py-0.5 rounded border border-[#FF2D2D]/20 font-black uppercase tracking-wider animate-pulse">
                      Live Preview
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mt-1">
                    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded border w-fit ${previewSemantic.colorClass}`}>
                      {previewSemantic.title}
                    </span>
                    <p className="text-gray-300 text-[11px] leading-relaxed font-medium">
                      {previewSemantic.desc}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 border-t border-white/5 pt-4 mt-6">
              <AntButton
                htmlType="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 cursor-pointer"
              >
                Hủy bỏ
              </AntButton>
              <AntButton
                htmlType="submit"
                className="flex-1 py-2 text-xs font-bold bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 text-white rounded-xl cursor-pointer"
              >
                Lưu Luật
              </AntButton>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};
