import React from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { Switch, InputNumber } from 'antd';
import type { ApiPrice } from '../../../../../types/showtime';

const getFormatName = (ticketType: string): string => {
  if (!ticketType) return '2D';
  let rawName = '';
  if (ticketType.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(ticketType);
      rawName = obj.roomType || obj.room || '';
    } catch (e) {
      // ignore
    }
  }
  if (!rawName) {
    rawName = ticketType;
  }

  const cleanRaw = rawName.toUpperCase();
  if (cleanRaw.includes('IMAX')) return 'IMAX';
  if (cleanRaw.includes('3D')) return '3D';

  if (rawName !== 'Standard' && rawName !== 'VIP' && rawName !== '2D') {
    return `2D (${rawName})`;
  }
  return '2D';
};

export interface BulkTimePanelProps {
  upcomingDates: Array<{ dateVal: string; displayVal: string }>;
  bulkSelectedDates: string[];
  setBulkSelectedDates: React.Dispatch<React.SetStateAction<string[]>>;
  autoStartHour: number | '';
  setAutoStartHour: (val: number | '') => void;
  bufferMinutes: number;
  setBufferMinutes: (val: number) => void;
  bulkStaggerMinutes: number;
  setBulkStaggerMinutes: (val: number) => void;
  bulkPriceId: number;
  setBulkPriceId: (id: number) => void;
  dbPrices: ApiPrice[];
  handlePreviewSchedule: () => void;
  setIsBulkDryRun: (val: boolean) => void;
  flatPriceEnabled: boolean;
  setFlatPriceEnabled: (val: boolean) => void;
  flatPrice: number | null;
  setFlatPrice: (val: number | null) => void;
  bulkOptimizePrimeTime: boolean;
  setBulkOptimizePrimeTime: (val: boolean) => void;
}

export const BulkTimePanel: React.FC<BulkTimePanelProps> = React.memo(({
  upcomingDates,
  bulkSelectedDates,
  setBulkSelectedDates,
  autoStartHour,
  setAutoStartHour,
  bufferMinutes,
  setBufferMinutes,
  bulkStaggerMinutes,
  setBulkStaggerMinutes,
  bulkPriceId,
  setBulkPriceId,
  dbPrices,
  handlePreviewSchedule,
  setIsBulkDryRun,
  flatPriceEnabled,
  setFlatPriceEnabled,
  flatPrice,
  setFlatPrice,
  bulkOptimizePrimeTime,
  setBulkOptimizePrimeTime
}) => {

  const handlePriceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBulkPriceId(parseInt(e.target.value) || (dbPrices[0]?.priceId || 1));
    setIsBulkDryRun(false);
  };

  const handleBufferChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBufferMinutes(parseInt(e.target.value) || 15);
    setIsBulkDryRun(false);
  };

  return (
    <div className="bg-[#0c0f19]/80 backdrop-blur-md border border-white/[0.06] p-5 rounded-2xl flex flex-col gap-4 shadow-glass justify-between">
      <div className="flex flex-col gap-4">


        {/* Date Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-400 font-semibold">Ngày lên lịch chiếu</span>
          <div className="bg-background/40 border border-white/[0.06] p-2.5 rounded-xl max-h-[140px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
            {upcomingDates.map(({ dateVal, displayVal }) => {
              const checked = bulkSelectedDates.includes(dateVal);
              const toggleDate = () => {
                setIsBulkDryRun(false);
                setBulkSelectedDates(prev =>
                  checked ? prev.filter(d => d !== dateVal) : [...prev, dateVal]
                );
              };

              return (
                <div
                  key={dateVal}
                  className={`flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 select-none group/check cursor-pointer ${checked
                    ? 'bg-brand/[0.04] border border-brand/20'
                    : 'border border-transparent hover:bg-white/[0.02]'
                    }`}
                  onClick={toggleDate}
                >
                  <div
                    className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-all duration-200 ${checked
                      ? 'bg-brand border-brand shadow-[0_0_8px_rgba(229,9,20,0.4)]'
                      : 'border-white/20 group-hover/check:border-white/40'
                      }`}
                  >
                    {checked && <Check size={11} className="text-white stroke-[3]" />}
                  </div>
                  <span className={`text-xs transition-colors duration-200 font-medium ${checked ? 'text-white font-semibold' : 'text-gray-400'}`}>
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rules Section */}
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-3 bg-background/40 border border-white/[0.06] p-3.5 rounded-xl">
            {/* Start Hour */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-gray-300 font-medium">Giờ bắt đầu</span>
                <span className="text-[10px] text-gray-500">Bắt đầu suất chiếu đầu tiên</span>
              </div>
              <div className="relative min-w-[120px]">
                <select
                  value={autoStartHour}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAutoStartHour(val === '' ? '' : parseInt(val, 10));
                    setIsBulkDryRun(false);
                  }}
                  className="w-full bg-[#05070F] border border-white/10 hover:border-white/25 px-2.5 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-brand cursor-pointer appearance-none pr-8 transition-all"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                  <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Buffer */}
            <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-2.5">
              <div className="flex flex-col">
                <span className="text-xs text-gray-300 font-medium">Buffer dọn phòng</span>
                <span className="text-[10px] text-gray-500">Thời gian nghỉ dọn dẹp giữa các suất</span>
              </div>
              <div className="relative min-w-[140px]">
                <select
                  value={bufferMinutes}
                  onChange={handleBufferChange}
                  className="w-full bg-[#05070F] border border-white/10 hover:border-white/25 px-2.5 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-brand cursor-pointer appearance-none pr-8 transition-all"
                >
                  <option value={10}>10 phút</option>
                  <option value={15}>15 phút (Chuẩn)</option>
                  <option value={20}>20 phút</option>
                  <option value={30}>30 phút</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                  <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Stagger */}
            <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-2.5">
              <div className="flex flex-col">
                <span className="text-xs text-gray-300 font-medium">Giãn cách các phòng</span>
                <span className="text-[10px] text-gray-500">Giãn cách bắt đầu giữa các phòng</span>
              </div>
              <div className="relative min-w-[140px]">
                <select
                  value={bulkStaggerMinutes}
                  onChange={(e) => {
                    setBulkStaggerMinutes(parseInt(e.target.value) || 20);
                    setIsBulkDryRun(false);
                  }}
                  className="w-full bg-[#05070F] border border-white/10 hover:border-white/25 px-2.5 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-brand cursor-pointer appearance-none pr-8 transition-all"
                >
                  <option value={5}>5 phút</option>
                  <option value={10}>10 phút</option>
                  <option value={15}>15 phút</option>
                  <option value={20}>20 phút (Chuẩn)</option>
                  <option value={30}>30 phút</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                  <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Prime Time Optimize */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-0.5">
              <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                <Zap size={13} className="text-yellow-400 fill-yellow-400/20" />
                Tối ưu xếp lịch Giờ Vàng (18h - 22h)
              </span>
              <Switch
                checked={bulkOptimizePrimeTime}
                onChange={(checked) => {
                  setBulkOptimizePrimeTime(checked);
                  setIsBulkDryRun(false);
                }}
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Flat Price Event Override Toggle */}
        <div className="flex items-center justify-between mt-1 mb-0.5 p-1 bg-white/[0.01] border border-white/[0.04] rounded-lg px-3 py-2">
          <span className="text-xs text-gray-400 font-semibold">Thiết lập đồng giá sự kiện</span>
          <Switch
            checked={flatPriceEnabled}
            onChange={(checked) => {
              setFlatPriceEnabled(checked);
              setIsBulkDryRun(false);
            }}
            size="small"
          />
        </div>

        {flatPriceEnabled ? (
          <div className="flex flex-col gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400 font-semibold">Giá vé đồng giá sự kiện (VND)</span>
            <InputNumber
              min={0}
              step={5000}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value ? parseInt(value.replace(/\$\s?|(,*)/g, ''), 10) : 0}
              value={flatPrice}
              onChange={(val) => {
                setFlatPrice(val);
                setIsBulkDryRun(false);
              }}
              className="w-full bg-[#05070F] border border-white/10 text-white rounded-lg custom-input-number"
              style={{
                backgroundColor: '#05070F',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                width: '100%'
              }}
            />
            <span className="text-[10px] text-[#e5a93b]">
              💡 Lưu ý: Giá trị này sẽ ghi đè giá tính toán từ Pricing Engine cho loạt suất chiếu này.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400 font-semibold">Định dạng gốc (Format Base)</span>
            <div className="relative">
              <select
                value={bulkPriceId}
                onChange={handlePriceChange}
                className="w-full bg-[#05070F] border border-white/10 hover:border-white/20 focus:border-brand px-3 py-2 text-xs text-white rounded-xl focus:outline-none cursor-pointer transition-all appearance-none pr-10"
              >
                {dbPrices.map(p => {
                  const formatName = getFormatName(p.ticketType);
                  return (
                    <option key={p.priceId} value={p.priceId}>
                      Suất chiếu định dạng cơ sở: {formatName}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
              💡 Hệ thống tự động áp dụng giá nền theo thời gian và cộng dồn phụ thu ghế/phòng chiếu thông qua Pricing Engine.
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handlePreviewSchedule}
        className="w-full mt-4 bg-brand hover:bg-brand-hover text-white font-bold text-xs py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-brand hover:shadow-[0_0_24px_rgba(229,9,20,0.45)] transform active:scale-[0.98] duration-200"
      >
        <Sparkles size={14} className="animate-pulse" /> Xem trước lịch chiếu
      </button>
    </div>
  );
});

BulkTimePanel.displayName = 'BulkTimePanel';