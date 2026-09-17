import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Loader2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';

interface NewsItem {
  id: number;
  title: string;
  shortDesc?: string;
  content?: string;
  image?: string;
  category: 'news' | 'events';
  categoryLabel: string;
  slug: string;
  trending: boolean;
  tag?: string;
  eventDate?: string;
  isActive: boolean;
  createdAt: string;
}

export const NewsManagement: React.FC = () => {
  const { showToast } = useToast();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Search, filter, and pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 8;

  // Modals & form state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: '',
    shortDesc: '',
    content: '',
    image: '',
    category: 'news' as 'news' | 'events',
    slug: '',
    trending: false,
    tag: '',
    eventDate: '',
    isActive: true,
  });

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/news/admin', {
        params: {
          Search: search || undefined,
          Category: categoryFilter || undefined,
          PageNumber: page,
          PageSize: pageSize,
        },
      });
      const data = response.data;
      setNewsList(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(data?.totalCount ?? 0);
    } catch (error) {
      console.error('Failed to fetch news', error);
      showToast('Không thể tải danh sách tin tức từ máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [search, categoryFilter, page]);

  const handleOpenAdd = () => {
    setSelectedNews(null);
    setForm({
      title: '',
      shortDesc: '',
      content: '',
      image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800',
      category: 'news',
      slug: '',
      trending: false,
      tag: '',
      eventDate: '',
      isActive: true,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (news: NewsItem) => {
    setSelectedNews(news);
    setForm({
      title: news.title,
      shortDesc: news.shortDesc || '',
      content: news.content || '',
      image: news.image || '',
      category: news.category,
      slug: news.slug,
      trending: news.trending,
      tag: news.tag || '',
      eventDate: news.eventDate || '',
      isActive: news.isActive,
    });
    setIsOpen(true);
  };

  const handleToggleStatus = async (news: NewsItem) => {
    setTogglingId(news.id);
    try {
      const payload = {
        title: news.title,
        shortDesc: news.shortDesc,
        content: news.content,
        image: news.image,
        category: news.category,
        slug: news.slug,
        trending: news.trending,
        tag: news.tag,
        eventDate: news.eventDate,
        isActive: !news.isActive
      };
      await apiClient.put(`/news/${news.id}`, payload);
      showToast('Đã cập nhật trạng thái hoạt động.', 'success');
      fetchNews();
    } catch (error: any) {
      console.error('Failed to toggle status', error);
      showToast('Lỗi khi cập nhật trạng thái.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        shortDesc: form.shortDesc.trim() || null,
        content: form.content.trim() || null,
        image: form.image.trim() || null,
        category: form.category,
        categoryLabel: form.category === 'events' ? 'Sự kiện' : 'Tin điện ảnh',
        slug: form.slug.trim() || null,
        trending: form.trending,
        tag: form.category === 'events' ? form.tag.trim() : null,
        eventDate: form.category === 'events' ? form.eventDate.trim() : null,
        isActive: form.isActive,
      };

      if (selectedNews) {
        await apiClient.put(`/news/${selectedNews.id}`, payload);
        showToast('Đã cập nhật tin tức/sự kiện.', 'success');
      } else {
        await apiClient.post('/news', payload);
        showToast('Đã thêm bài viết tin tức/sự kiện mới.', 'success');
      }
      setIsOpen(false);
      fetchNews();
    } catch (error: any) {
      console.error('Failed to save news', error);
      showToast(error.response?.data?.Message || 'Lỗi khi lưu bài viết.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrigger = (id: number) => {
    setNewsToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!newsToDelete) return;
    try {
      await apiClient.delete(`/news/${newsToDelete}`);
      showToast('Đã xóa thành công bài viết.', 'success');
      setIsDeleteOpen(false);
      fetchNews();
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi xóa bài viết.', 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Compute metrics for analytics cards
  const totalNewsCount = newsList.filter(n => n.category === 'news').length;
  const totalEventsCount = newsList.filter(n => n.category === 'events').length;
  const trendingCount = newsList.filter(n => n.trending).length;

  return (
    <div className="flex flex-col gap-6 text-left select-none pb-12 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
            <Newspaper size={24} className="text-brand animate-pulse" /> Quản Lý Tin Tức & Sự Kiện
          </h2>
          <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block mt-1">
            Đăng tin tức điện ảnh, thiết lập lễ hội phim, suất chiếu sớm, banner sự kiện và bài viết nổi bật
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider py-2.5 rounded-xl"
        >
          <Plus size={14} /> Thêm Bài Viết Mới
        </Button>
      </div>

      {/* KPI stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="h-10 w-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand shrink-0">
            <Newspaper size={18} />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block">Tổng Bài Viết</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">{totalCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="h-10 w-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block">Tin Điện Ảnh</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">{totalNewsCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="h-10 w-10 bg-brand-gold/10 border border-brand-gold/20 rounded-xl flex items-center justify-center text-brand-gold shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block">Sự Kiện Hot</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">{totalEventsCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block">Xu Hướng (Trending)</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">{trendingCount}</span>
          </div>
        </div>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-semibold">
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-3.5 top-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc liên kết tĩnh slug..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 bg-[#0e0e12]/60 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-500 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-3 bg-[#0e0e12]/60 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-brand transition-all font-semibold cursor-pointer"
          >
            <option value="" className="bg-[#121217]">Tất Cả Thể Loại</option>
            <option value="news" className="bg-[#121217]">Tin Điện Ảnh (News)</option>
            <option value="events" className="bg-[#121217]">Sự Kiện Đặc Biệt (Events)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
              <th className="p-4">Bài viết</th>
              <th className="p-4">Thể Loại</th>
              <th className="p-4">Đường Dẫn Slug</th>
              <th className="p-4">Tag / Thời Gian Sự Kiện</th>
              <th className="p-4 text-center">Xu Hướng</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-4 flex items-center gap-3">
                    <div className="h-10 w-16 bg-white/5 rounded-lg" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-4 bg-white/5 rounded w-48" />
                      <div className="h-3 bg-white/5 rounded w-32" />
                    </div>
                  </td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                  <td className="p-4 text-center"><div className="h-4 bg-white/5 rounded w-6 mx-auto" /></td>
                  <td className="p-4 text-center"><div className="h-4 bg-white/5 rounded w-14 mx-auto" /></td>
                  <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : newsList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500 font-bold">
                  Không tìm thấy bài viết tin tức hoặc sự kiện nào.
                </td>
              </tr>
            ) : (
              newsList.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 rounded-lg overflow-hidden border border-white/5 bg-black/40 shrink-0">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-[12px] block">{item.title}</span>
                        {item.shortDesc && <span className="block text-[10px] text-gray-500 font-normal mt-0.5 max-w-xs truncate">{item.shortDesc}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {item.category === 'events' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-2 py-0.5 rounded">
                        Sự Kiện
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                        Tin Điện Ảnh
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-gray-400 font-mono text-[11px]">{item.slug}</span>
                  </td>
                  <td className="p-4 text-gray-400">
                    {item.category === 'events' ? (
                      <div className="flex flex-col gap-0.5">
                        {item.tag && <span className="text-white text-[10px] font-bold">#{item.tag}</span>}
                        {item.eventDate && <span className="text-[9px] text-gray-500">{item.eventDate}</span>}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {item.trending ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                        <Sparkles size={10} className="fill-emerald-400" /> Hot
                      </span>
                    ) : (
                      <span className="text-gray-600 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      disabled={togglingId === item.id}
                      className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title={item.isActive ? 'Bấm để Vô hiệu' : 'Bấm để Kích hoạt'}
                    >
                      {togglingId === item.id ? (
                        <Loader2 size={16} className="animate-spin text-brand mx-auto" />
                      ) : item.isActive ? (
                        <ToggleRight size={22} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={22} className="text-gray-600" />
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
                        title="Sửa bài viết"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(item.id)}
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
                <Sparkles size={16} className="text-brand" /> {selectedNews ? 'Chỉnh Sửa Bài Viết' : 'Tạo Bài Viết Mới'}
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-2">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="Tiêu Đề Bài Viết"
                      required
                      placeholder="Nhập tiêu đề hấp dẫn..."
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    />

                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Thể Loại Bài Đăng</span>
                      <select
                        value={form.category}
                        onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full px-3 py-2.5 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold cursor-pointer"
                      >
                        <option value="news">Tin Điện Ảnh (News)</option>
                        <option value="events">Sự Kiện (Events)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="Đường Dẫn Slug (Tùy chọn)"
                      placeholder="vd: doctor-strange-pha-dao-doanh-thu"
                      value={form.slug}
                      onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                    />

                    <Input
                      type="text"
                      label="Đường Dẫn Hình Ảnh (URL)"
                      required
                      placeholder="Nhập link ảnh bài đăng..."
                      value={form.image}
                      onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
                    />
                  </div>

                  {/* Image Preview Box */}
                  {form.image && (
                    <div className="h-28 w-full rounded-xl overflow-hidden border border-white/5 bg-black/40">
                      <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Tóm Tắt Ngắn (Short Description)</span>
                    <textarea
                      placeholder="Nhập tóm tắt thu hút người đọc..."
                      value={form.shortDesc}
                      onChange={(e) => setForm(prev => ({ ...prev, shortDesc: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Nội Dung Chi Tiết (Markdown / HTML / Văn bản)</span>
                    <textarea
                      placeholder="Nhập nội dung đầy đủ của bài viết..."
                      value={form.content}
                      onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 bg-[#121216] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand font-semibold font-mono"
                    />
                  </div>

                  {/* Events Specific Fields */}
                  {form.category === 'events' && (
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5 animate-slideDown">
                      <Input
                        type="text"
                        label="Nhãn sự kiện (Tag - vd: FESTIVAL, HOT NIGHT)"
                        placeholder="FESTIVAL"
                        value={form.tag}
                        onChange={(e) => setForm(prev => ({ ...prev, tag: e.target.value }))}
                      />
                      <Input
                        type="text"
                        label="Thời gian diễn ra (Event Date - vd: 05/06 - 08/06)"
                        placeholder="05/06/2026 - 08/06/2026"
                        value={form.eventDate}
                        onChange={(e) => setForm(prev => ({ ...prev, eventDate: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="flex gap-6 items-center justify-start pl-2 border-t border-white/5 pt-4">
                    <label className="flex items-center gap-2 text-white font-bold select-none cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={form.trending}
                        onChange={(e) => setForm(prev => ({ ...prev, trending: e.target.checked }))}
                        className="rounded bg-[#121216] border-white/10 text-brand focus:ring-0 cursor-pointer"
                      />
                      Gắn thẻ Xu Hướng (Trending)
                    </label>

                    <label className="flex items-center gap-2 text-white font-bold select-none cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded bg-[#121216] border-white/10 text-brand focus:ring-0 cursor-pointer"
                      />
                      Kích hoạt hiển thị
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 border-t border-white/5 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} className="px-5 text-xs font-black uppercase">
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving} className="px-6 shadow-brand text-xs font-black uppercase flex items-center gap-1.5">
                    {saving && <Loader2 size={12} className="animate-spin" />}
                    Lưu Lại
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-left"
            >
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                ⚠️ Xác nhận xóa bài viết
              </h3>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                Bạn có chắc chắn muốn xóa bài viết tin tức/sự kiện này? Thao tác này sẽ xóa vĩnh viễn dữ liệu và không thể hoàn tác.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setIsDeleteOpen(false)} className="px-5 text-xs font-black uppercase">
                  Hủy
                </Button>
                <Button variant="primary" onClick={handleDelete} className="px-5 shadow-brand text-xs font-black uppercase">
                  Đồng ý xóa
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
