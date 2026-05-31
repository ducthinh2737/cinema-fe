import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../../contexts/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { KeyRound, ArrowLeft, MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';

// Zod Validation Schema
const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập Email').email('Địa chỉ Email không hợp lệ'),
});

type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFields>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFields) => {
    console.log('Password reset requested for:', data.email);
    setLoading(true);
    try {
      // Perform mock or endpoint recovery post (standard simulated recovery service)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitted(true);
      showToast('Đã gửi liên kết khôi phục đến email của bạn!', 'success');
    } catch (err) {
      showToast('Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <GlassCard className="w-full text-center border border-white/5 relative overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.05)]">
        {/* Subtle decorative neon indicator top border */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full animate-bounce">
              <MailCheck size={32} />
            </div>
            <h2 className="text-xl font-black text-white">Kiểm Tra Email Của Bạn</h2>
            <p className="text-xs text-gray-400 leading-relaxed font-sans max-w-sm">
              Chúng tôi đã gửi một liên kết khôi phục bảo mật. Vui lòng làm theo hướng dẫn trong thư để đặt lại mật khẩu của bạn.
            </p>
            <Button variant="primary" fullWidth size="lg" className="mt-4" onClick={() => navigate('/login')}>
              Quay lại Đăng nhập
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-black text-white mb-2 tracking-wide flex items-center justify-center gap-2">
              <KeyRound size={18} className="text-brand" /> Đặt Lại Mật Khẩu
            </h2>
            <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
              Nhập địa chỉ email đăng ký tài khoản của bạn, chúng tôi sẽ gửi liên kết để thiết lập lại mật khẩu.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <Input
                type="email"
                label="Địa chỉ Email"
                placeholder="name@example.com"
                error={errors.email?.message}
                disabled={loading}
                {...register('email')}
              />

              <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading} className="shadow-brand">
                {loading ? 'Đang gửi liên kết...' : 'Gửi liên kết khôi phục'}
              </Button>
            </form>

            <div className="mt-6 flex justify-center">
              <Link to="/login" className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1 font-bold uppercase tracking-wider">
                <ArrowLeft size={12} /> Quay lại Đăng nhập
              </Link>
            </div>
          </>
        )}
      </GlassCard>
    </motion.div>
  );
};
