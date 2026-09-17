import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PromotionHero,
  PromotionTabs,
  PromotionCard,
  VoucherCard,
  NewsCard,
  EventSlider,
  NewsletterSection,
  TrendingSidebar,
} from '../components';
import type {
  PromotionCategory,
  PromotionItem,
  VoucherItem,
  NewsItem,
  EventItem,
} from '../components';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { apiClient, getImageUrl } from '../api/client';
import type { PagedResult } from '../types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PROMO_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=800',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800',
  'https://images.unsplash.com/photo-1578496781985-452701896de7?q=80&w=800',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=800',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800',
] as const;

// ─────────────────────────────────────────────
// Mock Fallback Data
// ─────────────────────────────────────────────





// ─────────────────────────────────────────────
// API Data Normalizers
// ─────────────────────────────────────────────

function normalizePromotions(items: any[]): PromotionItem[] {
  return items.map((p, idx) => ({
    id: p.promotionId,
    title: p.name,
    shortDesc: p.description ?? '',
    image: PROMO_IMAGE_POOL[idx % PROMO_IMAGE_POOL.length],
    date: p.endDate
      ? new Date(p.endDate).toLocaleDateString('vi-VN')
      : 'Hạn dài',
    category: p.isAutoApply ? 'promotions' : 'members',
    categoryLabel: p.isAutoApply ? 'Khuyến mãi' : 'Thành viên',
    slug: p.promoCode?.toLowerCase() ?? `promo-${p.promotionId}`,
  }));
}

function normalizeVouchers(items: any[]): VoucherItem[] {
  return items
    .filter((p) => !p.isAutoApply && p.promoCode)
    .map((p) => ({
      id: p.promotionId,
      code: p.promoCode,
      discountType: (
        p.discountType === 'Percentage' ? 'Percentage' : 'FixedAmount'
      ) as 'Percentage' | 'FixedAmount',
      discountValue: p.discountValue,
      minOrderValue: p.minimumOrderValue,
      description:
        p.description ??
        `Giảm ngay ${p.discountType === 'Percentage'
          ? `${p.discountValue}%`
          : `${p.discountValue.toLocaleString()}đ`
        }`,
      endDate: p.endDate,
    }));
}



function normalizeNews(items: any[]): NewsItem[] {
  return items.map((n) => ({
    id: n.id,
    title: n.title,
    shortDesc: n.shortDesc ?? n.description ?? '',
    image: getImageUrl(n.image),
    date: n.date ?? (n.createdAt ? new Date(n.createdAt).toLocaleDateString('vi-VN') : ''),
    category: n.category,
    categoryLabel: n.categoryLabel ?? 'Tin tức',
    slug: n.slug,
    trending: n.trending,
  }));
}

function normalizeEvents(items: any[]): EventItem[] {
  return items.map((e) => ({
    id: e.id,
    title: e.title,
    image: getImageUrl(e.image),
    date: e.date ?? e.eventDate ?? '',
    tag: e.tag ?? 'SỰ KIỆN',
    description: e.description ?? e.shortDesc ?? '',
  }));
}

// ─────────────────────────────────────────────
// Custom Hook — Data Fetching
// ─────────────────────────────────────────────

interface PromotionsData {
  promotions: PromotionItem[];
  vouchers: VoucherItem[];
  news: NewsItem[];
  events: EventItem[];
}

interface UsePromotionsDataReturn extends PromotionsData {
  loading: boolean;
  error: string | null;
}

function usePromotionsData(): UsePromotionsDataReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PromotionsData>({
    promotions: [],
    vouchers: [],
    news: [],
    events: [],
  });

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        // Run all requests in parallel; individual failures fall back to null
        const [promosRes, newsRes, eventsRes] = await Promise.all([
          apiClient
            .get<PagedResult<any>>('/promotions', {
              params: { IsActive: true, PageSize: 50 },
            })
            .catch((err) => {
              console.error('[Promotions] /promotions error:', err);
              return null;
            }),
          apiClient.get<any>('/news').catch((err) => {
            console.error('[Promotions] /news error:', err);
            return null;
          }),
          apiClient.get<any>('/events').catch((err) => {
            console.error('[Promotions] /events error:', err);
            return null;
          }),
        ]);

        console.log('[Promotions] raw response:', { promosRes, newsRes, eventsRes });

        if (cancelled) return;

        setData((prev) => {
          const next = { ...prev };

          // Promotions
          if (promosRes !== null) {
            const promoItems: any[] = promosRes.data?.items ?? [];
            console.log('[Promotions] promoItems:', promoItems);
            next.promotions = normalizePromotions(promoItems);
            next.vouchers = normalizeVouchers(promoItems);
          }

          // News
          if (newsRes !== null) {
            const newsItems: any[] = newsRes.data?.items ?? [];
            console.log('[Promotions] newsItems:', newsItems);
            next.news = normalizeNews(newsItems);
          }

          // Events
          if (eventsRes !== null) {
            const eventItems: any[] = eventsRes.data?.items ?? [];
            console.log('[Promotions] eventItems:', eventItems);
            next.events = normalizeEvents(eventItems);
          }

          console.log('[Promotions] Final state:', next);
          return next;
        });
      } catch (err) {
        if (!cancelled) {
          console.error('[Promotions] Unexpected fetch error:', err);
          setError('Không thể tải dữ liệu. Hiển thị nội dung mặc định.');
          // Data already initialised with mocks — no extra reset needed
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, error, ...data };
}

// ─────────────────────────────────────────────
// Tab Visibility Helpers
// ─────────────────────────────────────────────

const TAB_SECTIONS: Record<PromotionCategory, Record<string, boolean>> = {
  all: { promos: true, vouchers: true, news: true, events: true },
  promotions: { promos: true, vouchers: true, news: false, events: false },
  news: { promos: false, vouchers: false, news: true, events: false },
  events: { promos: false, vouchers: false, news: false, events: true },
};

// ─────────────────────────────────────────────
// Sub-components — Section Header
// ─────────────────────────────────────────────

interface SectionHeaderProps {
  label: string;
  accentColor?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  accentColor = 'bg-brand',
}) => (
  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
    <span className={`w-1.5 h-4 ${accentColor} rounded-full`} />
    {label}
  </h3>
);

// ─────────────────────────────────────────────
// Sub-components — Loading Skeleton
// ─────────────────────────────────────────────

const PromotionsLoadingSkeleton: React.FC = () => (
  <div className="flex flex-col gap-8 w-full" aria-busy="true" aria-label="Đang tải...">
    <SkeletonLoader className="h-64 w-full rounded-3xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SkeletonLoader className="h-48 w-full rounded-2xl" />
      <SkeletonLoader className="h-48 w-full rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonLoader className="h-32 w-full rounded-2xl" />
      <SkeletonLoader className="h-32 w-full rounded-2xl" />
      <SkeletonLoader className="h-32 w-full rounded-2xl" />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Sub-components — Error Banner
// ─────────────────────────────────────────────

interface ErrorBannerProps {
  message: string;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => (
  <div
    role="alert"
    className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-left"
  >
    ⚠️ {message}
  </div>
);

// ─────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────

export const Promotions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PromotionCategory>('all');
  const { loading, error, promotions, vouchers, news, events } =
    usePromotionsData();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Memoised filtered promotions — avoids re-filtering on unrelated renders
  const filteredPromotions = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'promotions') return promotions;
    return [];
  }, [activeTab, promotions]);

  const sections = TAB_SECTIONS[activeTab] ?? TAB_SECTIONS.all;
  // Stable callbacks — avoids child re-renders
  const handlePostClick = useCallback((slug: string) => {
    // TODO: navigate to /promotions/:slug when detail page is ready
    console.log('[Promotions] Navigate to:', slug);
  }, []);

  // Map popular promotions from real promotions list
  const popularPromos = useMemo(() => {
    return promotions.slice(0, 3).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      image: p.image,
      discount: p.categoryLabel === 'Thành viên' ? 'MEMBERS' : 'PROMO',
    }));
  }, [promotions]);

  // Map trending posts from real news list
  const trendingPosts = useMemo(() => {
    return news.slice(0, 3).map((n, idx) => ({
      id: n.id,
      title: n.title,
      slug: n.slug,
      views: (15000 - idx * 3000).toLocaleString('vi-VN'),
      date: n.date,
    }));
  }, [news]);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12 select-none overflow-hidden">
      {/* Hero */}
      <PromotionHero />

      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 mt-12 flex flex-col gap-10">
        {/* Tab bar */}
        <PromotionTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Optional error notice (data still shown from mock) */}
        {error && <ErrorBanner message={error} />}

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* ── Main column ── */}
          <div className="flex-grow flex flex-col gap-12 w-full lg:w-0 min-w-0">
            {loading ? (
              <PromotionsLoadingSkeleton />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="flex flex-col gap-12 w-full"
                >


                  {/* Events slider */}
                  {sections.events && events.length > 0 && (
                    <section className="flex flex-col gap-5 text-left">
                      <SectionHeader label="Sự Kiện Đặc Biệt" />
                      <EventSlider events={events} />
                    </section>
                  )}

                  {/* Vouchers */}
                  {sections.vouchers && vouchers.length > 0 && (
                    <section className="flex flex-col gap-5 text-left">
                      <SectionHeader
                        label="Voucher Giảm Giá Vé & Bắp Nước"
                        accentColor="bg-brand-gold"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {vouchers.map((v) => (
                          <VoucherCard key={v.id} voucher={v} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Promotions grid */}
                  {sections.promos && filteredPromotions.length > 0 && (
                    <section className="flex flex-col gap-5 text-left">
                      <SectionHeader label="Ưu Đãi" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {filteredPromotions.map((promo) => (
                          <PromotionCard
                            key={promo.id}
                            item={promo}
                            onClick={handlePostClick}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* News grid */}
                  {sections.news && news.length > 0 && (
                    <section className="flex flex-col gap-5 text-left">
                      <SectionHeader label="Tin Tức " />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {news.map((n) => (
                          <NewsCard key={n.id} news={n} onClick={handlePostClick} />
                        ))}
                      </div>
                    </section>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ── Sticky sidebar (desktop only) ── */}
          <aside className="hidden lg:block w-80 shrink-0">
            <TrendingSidebar
              trendingPosts={trendingPosts}
              popularPromos={popularPromos}
              onPostClick={handlePostClick}
            />
          </aside>
        </div>

        {/* Newsletter */}
        <div className="mt-8">
          <NewsletterSection />
        </div>
      </div>
    </div>
  );
};

export default Promotions;