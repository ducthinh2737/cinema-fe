import React from 'react';
import { Newspaper, Heart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

export const NewsSection: React.FC = () => {
  const blogs = [
    {
      id: 1,
      title: "Review Chi Tiết: Avengers Secret Wars - Hồi Kết Trọn Vẹn Hơn Cả Endgame?",
      author: "Nguyễn Minh",
      date: "28/05/2026",
      desc: "Trận chiến đa vũ trụ khốc liệt mang lại vô vàn bất ngờ và xúc động cho người hâm mộ Marvel.",
      views: "1.2K",
      likes: 340,
      image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=350",
      tag: "Phim Hay"
    },
    {
      id: 2,
      title: "Dune Part III Xác Nhận Bắt Đầu Bấm Máy: Những Chi Tiết Độc Quyền Đầu Tiên",
      author: "Đình Hoàng",
      date: "27/05/2026",
      desc: "Đạo diễn Denis Villeneuve hé lộ những đại cảnh hành tinh sa mạc mới và sự xuất hiện của các gia tộc bí ẩn.",
      views: "890",
      likes: 195,
      image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=350",
      tag: "Điện Ảnh"
    },
    {
      id: 3,
      title: "Top 5 Phim Bom Tấn Đáng Mong Chờ Nhất Mùa Hè 2026 Bạn Không Thể Bỏ Lỡ",
      author: "Phan Tuyết",
      date: "26/05/2026",
      desc: "Điểm qua danh sách các siêu phẩm sắp bùng nổ phòng vé từ hành động viễn tưởng đến hoạt hình đỉnh cao.",
      views: "2.4K",
      likes: 520,
      image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=350",
      tag: "Bảng Xếp Hạng"
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full select-none text-left">
      <div>
        <h3 className="text-lg font-black uppercase tracking-widest text-white border-l-4 border-brand pl-3 flex items-center gap-2">
          <Newspaper className="text-brand" size={20} /> Tin Tức & Đánh Giá
        </h3>
        <p className="text-xs text-gray-500 mt-1 pl-4">Cập nhật tin tức điện ảnh nóng hổi, bình luận phim chuyên sâu từ các nhà phê bình.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {blogs.map((blog) => (
          <motion.div
            key={blog.id}
            whileHover={{ y: -6 }}
            className="flex flex-col gap-4 bg-[#0a0a0f] border border-white/5 rounded-3xl p-4 transition-all hover:bg-white/[0.02] shadow-sm hover:shadow-lg group"
          >
            {/* Image */}
            <div className="relative aspect-video rounded-2xl overflow-hidden">
              <img
                src={blog.image}
                alt={blog.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
              />
              <span className="absolute bottom-3 left-3 bg-[#07070a]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-bold text-white">
                {blog.tag}
              </span>
            </div>

            {/* Content Details */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold">
                <span>By {blog.author}</span>
                <span>•</span>
                <span>{blog.date}</span>
              </div>
              <h4 className="text-sm font-black text-white group-hover:text-brand transition-colors leading-snug line-clamp-2">
                {blog.title}
              </h4>
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-3">
                {blog.desc}
              </p>
            </div>

            {/* Bottom Actions info */}
            <div className="flex items-center gap-4 border-t border-white/5 pt-3.5 mt-auto text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Eye size={12} /> {blog.views} lượt xem
              </span>
              <span className="flex items-center gap-1.5">
                <Heart size={12} className="text-red-500/80 fill-red-500/10" /> {blog.likes} yêu thích
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
