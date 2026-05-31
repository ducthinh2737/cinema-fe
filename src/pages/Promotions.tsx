import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  PromotionHero, 
  PromotionTabs, 
  PromotionCard, 
  FeaturedPromotion, 
  VoucherCard, 
  NewsCard, 
  EventSlider, 
  NewsletterSection, 
  TrendingSidebar
} from '../components';
import type {
  PromotionCategory,
  PromotionItem,
  FeaturedPromoItem,
  VoucherItem,
  NewsItem,
  EventItem,
  TrendingPost,
  PopularPromo
} from '../components';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { apiClient } from '../api/client';
import type { PagedResult } from '../types';

// Mock Fallbacks
const MOCK_FEATURED_PROMO: FeaturedPromoItem = {
  id: 1,
  title: "Đồng Giá Vé 45K Cho Học Sinh Sinh Viên Toàn Quốc",
  desc: "Ưu đãi cực khủng dành riêng cho các bạn học sinh, sinh viên khi mua vé xem phim trực tiếp tại quầy hoặc đặt trực tuyến. Áp dụng cho mọi suất chiếu 2D từ Thứ 2 đến Thứ 6 hàng tuần.",
  image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=800",
  discountBadge: "ĐỒNG GIÁ 45K",
  expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days from now
  code: "STUDENT45K",
  slug: "dong-gia-ve-45k-hoc-sinh-sinh-vien"
};

const MOCK_PROMOTIONS: PromotionItem[] = [
  {
    id: 101,
    title: "Happy Wednesday - Đồng Giá Vé 50K Mỗi Thứ Tư",
    shortDesc: "Tận hưởng ngày Thứ Tư vui vẻ cùng CinemaPass với ưu đãi đồng giá vé 2D chỉ 50.000đ cho mọi khung giờ chiếu.",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600",
    date: "31/12/2026",
    category: "promotions",
    categoryLabel: "Khuyến mãi",
    slug: "happy-wednesday-dong-gia-50k"
  },
  {
    id: 102,
    title: "Combo Bắp Nước Solo Chỉ 35K Khi Đặt Vé Online",
    shortDesc: "Tiết kiệm hơn khi mua combo bắp ngọt 60oz + 1 ly nước ngọt 22oz kèm theo vé xem phim trên ứng dụng hoặc website.",
    image: "https://images.unsplash.com/photo-1578496781985-452701896de7?q=80&w=600",
    date: "15/10/2026",
    category: "promotions",
    categoryLabel: "Khuyến mãi",
    slug: "combo-bap-nuoc-solo-35k"
  },
  {
    id: 103,
    title: "Nhân Đôi Điểm Thích Lũy Thành Viên Vào Ngày Chủ Nhật",
    shortDesc: "Đặc quyền thành viên VIP: Tích lũy gấp đôi điểm membership cho mọi giao dịch đặt vé và dịch vụ bắp nước vào Chủ Nhật.",
    image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600",
    date: "30/11/2026",
    category: "members",
    categoryLabel: "Thành viên",
    slug: "nhan-doi-diem-thanh-vien-chu-nhat"
  },
  {
    id: 104,
    title: "Đăng Ký Thành Viên Mới Nhận Ngay Voucher Giảm 50%",
    shortDesc: "Mở tài khoản thành viên CinemaPass ngay hôm nay để nhận ngay mã giảm giá 50% cho lượt đặt vé xem phim đầu tiên.",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=600",
    date: "31/12/2026",
    category: "members",
    categoryLabel: "Thành viên",
    slug: "thanh-vien-moi-giam-50"
  }
];

const MOCK_NEWS: NewsItem[] = [
  {
    id: 201,
    title: "Bom Tấn Doctor Strange Phá Đảo Doanh Thu Phòng Vé Toàn Cầu",
    shortDesc: "Được đánh giá là siêu phẩm Marvel xuất sắc nhất năm, phần mới của Phù Thủy Tối Thượng liên tục xô đổ các kỷ lục doanh thu phòng vé.",
    image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400",
    date: "28/05/2026",
    category: "news",
    categoryLabel: "Tin điện ảnh",
    slug: "doctor-strange-pha-dao-doanh-thu",
    trending: true
  },
  {
    id: 202,
    title: "Top 5 Bộ Phim Chiếu Rạp Đáng Xem Nhất Trong Mùa Hè Này",
    shortDesc: "Điểm danh những cái tên đình đám sắp sửa đổ bộ phòng vé CinemaPass từ hoạt hình vui nhộn đến hành động giả tưởng kịch tính.",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=400",
    date: "27/05/2026",
    category: "news",
    categoryLabel: "Tin điện ảnh",
    slug: "top-5-phim-rap-dang-xem-mua-he"
  }
];

const MOCK_EVENTS: EventItem[] = [
  {
    id: 301,
    title: "Lễ Hội Anime Nhật Bản - Suất Chiếu Đặc Biệt & Giao Lưu Cosplay",
    description: "Sự kiện điện ảnh lớn nhất dành cho các fan Anime với suất chiếu sớm các bom tấn chưa từng công bố và buổi giao lưu, tặng quà lưu niệm vô cùng độc đáo.",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200",
    date: "05/06/2026 - 08/06/2026",
    tag: "FESTIVAL"
  },
  {
    id: 302,
    title: "Đêm Chiếu Phim Kinh Dị Giữa Đêm Khuya - Thách Thức Lòng Dũng Cảm",
    description: "Trải nghiệm rùng rợn độc quyền tại phòng chiếu Dolby Atmos với combo phim kinh dị bất ngờ chiếu liên tục từ 23h00 đến sáng.",
    image: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?q=80&w=1200",
    date: "31/10/2026",
    tag: "SPECIAL NIGHT"
  }
];

const MOCK_VOUCHERS: VoucherItem[] = [
  {
    id: 401,
    code: "CINEMA20",
    discountType: "Percentage",
    discountValue: 20,
    description: "Giảm 20% tổng giá trị vé đặt trực tuyến qua website/app.",
    endDate: "2026-12-31T23:59:59Z"
  },
  {
    id: 402,
    code: "POPCORN30",
    discountType: "FixedAmount",
    discountValue: 30000,
    description: "Giảm trực tiếp 30k khi mua bất kỳ Combo bắp nước cỡ lớn.",
    endDate: "2026-09-30T23:59:59Z"
  },
  {
    id: 403,
    code: "VIPMEMBER",
    discountType: "Percentage",
    discountValue: 15,
    description: "Ưu đãi 15% vé 3D/IMAX vào ngày sinh nhật thành viên VIP.",
    endDate: "2026-12-31T23:59:59Z"
  }
];

const MOCK_TRENDING_POSTS: TrendingPost[] = [
  { id: 1, title: "Hé lộ trailer bom tấn khoa học viễn tưởng hot nhất năm sau", slug: "he-lo-trailer-bom-tan-vien-tuong", views: "15,200", date: "28/05/2026" },
  { id: 2, title: "Lịch chiếu phim bom tấn Marvel tuần này có gì thay đổi?", slug: "lich-chieu-marvel-tuan-nay", views: "12,450", date: "27/05/2026" },
  { id: 3, title: "Hướng dẫn nhận voucher CGV 100K miễn phí trên CinemaPass", slug: "huong-dan-nhan-voucher-mien-phi", views: "9,800", date: "26/05/2026" },
];

const MOCK_POPULAR_PROMOS: PopularPromo[] = [
  { id: 1, title: "Giảm 50% vé thứ 2 cho chủ thẻ Techcombank", slug: "techcombank-giam-50", image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=300", discount: "50%" },
  { id: 2, title: "Tặng 1 ly nước ngọt cỡ vừa khi mua vé 3D", slug: "tang-nuoc-khi-mua-ve-3d", image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=300", discount: "FREE DRINK" },
];

export const Promotions: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PromotionCategory>('all');
  const [loading, setLoading] = useState(true);

  // States for API fetched data
  const [featuredPromo] = useState<FeaturedPromoItem>(MOCK_FEATURED_PROMO);
  const [promotions, setPromotions] = useState<PromotionItem[]>(MOCK_PROMOTIONS);
  const [vouchers, setVouchers] = useState<VoucherItem[]>(MOCK_VOUCHERS);
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
  const [events, setEvents] = useState<EventItem[]>(MOCK_EVENTS);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch promotions
        const promosRes = await apiClient.get<PagedResult<any>>('/promotions', {
          params: { IsActive: true, PageSize: 20 }
        }).catch(() => null);

        if (promosRes && promosRes.data?.items?.length > 0) {
          const formattedPromos = promosRes.data.items.map((p: any) => ({
            id: p.id,
            title: p.title,
            shortDesc: p.description || p.shortDescription || "",
            image: p.imageUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600",
            date: p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : "Hạn dài",
            category: p.category || 'promotions',
            categoryLabel: p.category === 'members' ? 'Thành viên' : 'Khuyến mãi',
            slug: p.slug || `promo-${p.id}`
          }));
          setPromotions(formattedPromos);
        }

        // Fetch vouchers
        const vouchersRes = await apiClient.get<any[]>('/vouchers').catch(() => null);
        if (vouchersRes && vouchersRes.data?.length > 0) {
          setVouchers(vouchersRes.data);
        }

        // Fetch news / events if endpoints exist
        const newsRes = await apiClient.get<any>('/news').catch(() => null);
        if (newsRes && newsRes.data?.items) {
          setNews(newsRes.data.items);
        }

        const eventsRes = await apiClient.get<any>('/events').catch(() => null);
        if (eventsRes && eventsRes.data?.items) {
          setEvents(eventsRes.data.items);
        }

      } catch (err) {
        console.error("Error loading promotions page datasets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePostClick = (slug: string) => {
    // Navigate to detail page or show modal
    console.log("Navigate to promo/news post:", slug);
  };

  const handleActionClick = (_slug: string) => {
    // Link to movies grid to book ticket
    navigate('/movies');
  };

  // Filters based on active tab
  const filteredPromotions = promotions.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'promotions') return p.category === 'promotions';
    if (activeTab === 'members') return p.category === 'members';
    return false;
  });

  const showVouchers = activeTab === 'all' || activeTab === 'vouchers';
  const showPromos = activeTab === 'all' || activeTab === 'promotions' || activeTab === 'members';
  const showNews = activeTab === 'all' || activeTab === 'news';
  const showEvents = activeTab === 'all' || activeTab === 'events';

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12 select-none overflow-hidden">
      
      {/* 1. Cinematic Hero Header */}
      <PromotionHero />

      {/* Main content grid */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 mt-12 flex flex-col gap-10">
        
        {/* 2. Categories selector tabs */}
        <PromotionTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* Left Main Column */}
          <div className="flex-grow flex flex-col gap-12 w-full lg:w-0">
            
            {loading ? (
              // Loading Skeleton State
              <div className="flex flex-col gap-8 w-full">
                <SkeletonLoader className="h-64 w-full rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SkeletonLoader className="h-48 w-full rounded-2xl" />
                  <SkeletonLoader className="h-48 w-full rounded-2xl" />
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-12 w-full"
                >
                  {/* 3. Featured Highlight Banner (only in General/Promos tabs) */}
                  {(activeTab === 'all' || activeTab === 'promotions') && featuredPromo && (
                    <FeaturedPromotion item={featuredPromo} onActionClick={handleActionClick} />
                  )}

                  {/* 4. Events Slider (only in All or Events tab) */}
                  {showEvents && events.length > 0 && (
                    <div className="flex flex-col gap-5 text-left">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand rounded-full" /> Sự Kiện Đặc Biệt & Lễ Hội Phim
                      </h3>
                      <EventSlider events={events} />
                    </div>
                  )}

                  {/* 5. Vouchers coupon section */}
                  {showVouchers && vouchers.length > 0 && (
                    <div className="flex flex-col gap-5 text-left">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand-gold rounded-full" /> Voucher Giảm Giá Vé & Bắp Nước
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {vouchers.map(v => (
                          <VoucherCard key={v.id} voucher={v} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. Promotions Grid */}
                  {showPromos && filteredPromotions.length > 0 && (
                    <div className="flex flex-col gap-5 text-left">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand rounded-full" /> Ưu Đãi Thành Viên & Chương Trình Hot
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {filteredPromotions.map(promo => (
                          <PromotionCard key={promo.id} item={promo} onClick={handlePostClick} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 7. Movie / Cinema News Grid */}
                  {showNews && news.length > 0 && (
                    <div className="flex flex-col gap-5 text-left">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand rounded-full" /> Tin Tức Giải Trí & Điện Ảnh Mới Nhất
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {news.map(n => (
                          <NewsCard key={n.id} news={n} onClick={handlePostClick} />
                        ))}
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            )}

          </div>

          {/* Right Sticky Sidebar (Desktop Only) */}
          <div className="hidden lg:block w-80 shrink-0">
            <TrendingSidebar
              trendingPosts={MOCK_TRENDING_POSTS}
              popularPromos={MOCK_POPULAR_PROMOS}
              onPostClick={handlePostClick}
            />
          </div>

        </div>

        {/* 8. Bottom Newsletter Box */}
        <div className="mt-8">
          <NewsletterSection />
        </div>

      </div>

    </div>
  );
};
export default Promotions;
