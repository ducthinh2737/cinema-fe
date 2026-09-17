import React from 'react';
import { Table, Popconfirm, Tooltip } from 'antd';
import { Clock, Search, Copy, Edit3, Trash2 } from 'lucide-react';
import type { ApiShowtime, ApiPrice, NormalizedMovie } from '../../../types/showtime';
import type { Cinema } from '../../../types';

interface TableTabProps {
  filteredTableList: ApiShowtime[];
  dbPrices: ApiPrice[];
  loading: boolean;
  movies: NormalizedMovie[];
  cinemas: Cinema[];
  selectedMovieId: number | 'ALL';
  setSelectedMovieId: (id: number | 'ALL') => void;
  selectedCinemaId: number | 'ALL';
  setSelectedCinemaId: (id: number | 'ALL') => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  page: number;
  setPage: (page: number) => void;
  getShowtimeStatus: (st: ApiShowtime) => string;
  onDuplicate: (st: ApiShowtime) => void;
  onEdit: (st: ApiShowtime) => void;
  onDelete: (id: number) => void;
}

import { formatLocalDate } from '../../../domain/showtime/engine';

const STATUS_STYLES: Record<string, { text: string; color: string; bg: string; border: string }> = {
  UPCOMING: { text: 'Sắp chiếu', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
  SELLING: { text: 'Đang bán vé', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
  SCREENING: { text: 'Đang chiếu', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  ENDED: { text: 'Đã kết thúc', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)' },
  CANCELLED: { text: 'Đã hủy', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' }
};

const formatVietnamTimeDisplay = (dateOrString: Date | string) => {
  return formatLocalDate(dateOrString, 'DD/MM/YYYY HH:mm');
};

export const TableTab: React.FC<TableTabProps> = React.memo(({
  filteredTableList,
  dbPrices,
  loading,
  movies,
  cinemas,
  selectedMovieId,
  setSelectedMovieId,
  selectedCinemaId,
  setSelectedCinemaId,
  filterDate,
  setFilterDate,
  filterStatus,
  setFilterStatus,
  searchText,
  setSearchText,
  page,
  setPage,
  getShowtimeStatus,
  onDuplicate,
  onEdit,
  onDelete
}) => {
  const columns = [
    {
      title: 'Mã',
      dataIndex: 'showtimeId',
      key: 'showtimeId',
      render: (id: number) => <span className="font-mono text-xs font-semibold text-gray-500">#{id}</span>,
      sorter: (a: ApiShowtime, b: ApiShowtime) => a.showtimeId - b.showtimeId,
    },
    {
      title: 'Phim',
      key: 'movie',
      render: (record: ApiShowtime) => {
        const movieObj = movies.find(m => m.movieId === record.movieId);
        return (
          <div className="max-w-[200px] text-left">
            <span className="block font-semibold text-white text-sm truncate">{record.movie?.title || movieObj?.title}</span>
            <span className="text-xs text-gray-500 mt-0.5 block">{record.movie?.genre?.genreName || movieObj?.genreName || 'Phim rạp'} · {record.movie?.duration || movieObj?.duration}p</span>
          </div>
        );
      },
    },
    {
      title: 'Địa điểm',
      key: 'location',
      render: (record: ApiShowtime) => (
        <div className="text-left">
          <span className="block font-semibold text-white text-sm">{record.cinemaName || 'CinemaPass'}</span>
          <span className="text-xs text-gray-500 block mt-0.5">
            {record.hallName || record.hall?.name} · {record.hall?.hallTypeName}
          </span>
        </div>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (val: string) => (
        <div className="flex items-center gap-1.5 font-mono text-sm text-gray-200">
          <Clock size={12} className="text-[#FF2D2D] shrink-0" />
          <span>{formatVietnamTimeDisplay(val)}</span>
        </div>
      ),
      sorter: (a: ApiShowtime, b: ApiShowtime) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    },
    {
      title: 'Giá vé',
      key: 'price',
      render: (record: ApiShowtime) => {
        const ticketPrice = dbPrices.find(p => p.priceId === record.priceId)?.value || record.priceValue || 80000;
        return (
          <span className="font-bold text-[#FFD54A] font-mono text-sm">
            {ticketPrice.toLocaleString()}đ
          </span>
        );
      },
      sorter: (a: ApiShowtime, b: ApiShowtime) => {
        const priceA = dbPrices.find(p => p.priceId === a.priceId)?.value || a.priceValue || 80000;
        const priceB = dbPrices.find(p => p.priceId === b.priceId)?.value || b.priceValue || 80000;
        return priceA - priceB;
      }
    },
    {
      title: 'Bán vé',
      key: 'booking',
      render: (record: ApiShowtime) => {
        const sold = record.soldSeats ?? (record.totalSeats !== undefined ? (record.totalSeats - record.availableSeats) : undefined);
        const totalSeatsValue = record.totalSeats ?? (sold !== undefined ? (record.availableSeats + sold) : undefined);
        const occupancyRate = (sold !== undefined && totalSeatsValue) ? Math.round((sold / totalSeatsValue) * 100) : null;

        return occupancyRate !== null && sold !== undefined ? (
          <div className="flex flex-col gap-1 w-24">
            <div className="flex justify-between text-[10px] font-semibold text-gray-400">
              <span>{sold} vé</span>
              <span>{occupancyRate}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF2D2D] rounded-full"
                style={{ width: `${occupancyRate}%`, boxShadow: '0 0 4px #FF2D2D' }}
              />
            </div>
          </div>
        ) : (
          <span className="text-gray-600 text-xs">—</span>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (record: ApiShowtime) => {
        const status = getShowtimeStatus(record);
        const styleObj = STATUS_STYLES[status] || STATUS_STYLES.UPCOMING;
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border"
            style={{
              color: styleObj.color,
              borderColor: styleObj.border,
              backgroundColor: styleObj.bg
            }}
          >
            {styleObj.text}
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right' as const,
      render: (record: ApiShowtime) => {
        const sold = record.soldSeats ?? (record.totalSeats !== undefined ? (record.totalSeats - record.availableSeats) : 0);
        const hasBookings = sold > 0;

        return (
          <div className="flex gap-1.5 justify-end">
            <Tooltip title="Sao chép">
              <button
                onClick={() => onDuplicate(record)}
                className="p-1.5 bg-white/5 border border-white/8 hover:border-blue-400/60 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              >
                <Copy size={13} />
              </button>
            </Tooltip>
            {hasBookings ? (
              <Tooltip title="Suất chiếu đã có khách đặt vé, không thể sửa">
                <button
                  disabled
                  className="p-1.5 bg-white/5 border border-white/8 text-[#FFD54A]/30 rounded-lg cursor-not-allowed flex items-center justify-center"
                >
                  <Edit3 size={13} />
                </button>
              </Tooltip>
            ) : (
              <Tooltip title="Chỉnh sửa">
                <button
                  onClick={() => onEdit(record)}
                  className="p-1.5 bg-white/5 border border-white/8 hover:border-yellow-400/60 hover:bg-yellow-500/10 text-[#FFD54A] rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Edit3 size={13} />
                </button>
              </Tooltip>
            )}
            {hasBookings ? (
              <Tooltip title="Suất chiếu đã có khách đặt vé, không thể hủy">
                <button
                  disabled
                  className="p-1.5 bg-white/5 border border-white/8 text-[#FF2D2D]/30 rounded-lg cursor-not-allowed flex items-center justify-center"
                >
                  <Trash2 size={11} />
                </button>
              </Tooltip>
            ) : (
              <Popconfirm
                title="Hủy suất chiếu này?"
                description="Lưu ý: Thao tác này sẽ hủy suất chiếu vĩnh viễn."
                onConfirm={() => onDelete(record.showtimeId)}
                okText="Xác nhận"
                cancelText="Bỏ qua"
                okButtonProps={{ danger: true }}
              >
                <button
                  className="p-1.5 bg-white/5 border border-white/8 hover:border-red-400/60 hover:bg-red-500/10 text-[#FF2D2D] rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Trash2 size={11} />
                </button>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="bg-[#0D111C]/40 border border-white/5 p-3 rounded-2xl flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[140px] flex-1">
          <span className="text-[10px] text-gray-500 font-semibold">Phim</span>
          <select
            value={selectedMovieId}
            onChange={(e) => { setSelectedMovieId(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)); setPage(1); }}
            className="w-full bg-[#05070F] border border-white/10 px-3 py-2 text-sm text-white rounded-lg focus:outline-none focus:border-[#FF2D2D] cursor-pointer"
          >
            <option value="ALL">Tất cả phim</option>
            {movies.map(m => (
              <option key={m.movieId} value={m.movieId}>{m.title}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[130px] flex-1">
          <span className="text-[10px] text-gray-500 font-semibold">Rạp</span>
          <select
            value={selectedCinemaId}
            onChange={(e) => { setSelectedCinemaId(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)); setPage(1); }}
            className="w-full bg-[#05070F] border border-white/10 px-3 py-2 text-sm text-white rounded-lg focus:outline-none focus:border-[#FF2D2D] cursor-pointer"
          >
            <option value="ALL">Tất cả rạp</option>
            {cinemas.map(c => (
              <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[130px]">
          <span className="text-[10px] text-gray-500 font-semibold">Ngày chiếu</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
            className="w-full bg-[#05070F] border border-white/10 px-3 py-2 text-sm text-white rounded-lg focus:outline-none focus:border-[#FF2D2D] cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-[10px] text-gray-500 font-semibold">Trạng thái</span>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="w-full bg-[#05070F] border border-white/10 px-3 py-2 text-sm text-white rounded-lg focus:outline-none focus:border-[#FF2D2D] cursor-pointer"
          >
            <option value="ALL">Tất cả</option>
            <option value="UPCOMING">Sắp chiếu</option>
            <option value="SELLING">Đang bán vé</option>
            <option value="SCREENING">Đang chiếu</option>
            <option value="ENDED">Đã kết thúc</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[150px] flex-1">
          <span className="text-[10px] text-gray-500 font-semibold">Tìm kiếm</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Tên phim..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-[#05070F] border border-white/10 pl-8 pr-3 py-2 text-sm text-white rounded-lg focus:outline-none focus:border-[#FF2D2D]"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md shadow-xl">
        <Table
          columns={columns}
          dataSource={filteredTableList}
          rowKey="showtimeId"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 8,
            onChange: (p) => setPage(p),
            className: "custom-table-pagination font-mono font-semibold text-xs px-4",
            showSizeChanger: false
          }}
          className="custom-table text-gray-300"
        />
      </div>
    </div>
  );
});

TableTab.displayName = 'TableTab';
