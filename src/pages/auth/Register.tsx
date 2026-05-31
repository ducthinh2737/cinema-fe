import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

// Zod Validation Schema
const registerSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ và tên').max(100, 'Họ và tên phải ít hơn 100 ký tự'),
  email: z.string().min(1, 'Vui lòng nhập Email').email('Địa chỉ Email không hợp lệ'),
  phoneNumber: z.string()
    .min(1, 'Vui lòng nhập số điện thoại')
    .regex(/^\d{10,11}$/, 'Số điện thoại phải chứa 10-11 chữ số'),
  password: z.string().min(6, 'Mật khẩu phải dài ít nhất 6 ký tự'),
});

type RegisterFields = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { loading, setAuthLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phoneNumber: '', password: '' },
  });

  const onSubmit = async (data: RegisterFields) => {
    setAuthLoading(true);
    try {
      await apiClient.post('/auth/register', data);
      showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
      navigate('/login');
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Đăng ký thất bại. Vui lòng thử lại.';
      showToast(msg, 'error');
    } finally {
      setAuthLoading(false);
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

        <h2 className="text-xl font-black text-white mb-6 tracking-wide flex items-center justify-center gap-2">
          <UserPlus size={18} className="text-brand" /> Tạo Tài Khoản
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            type="text"
            label="Họ và Tên"
            placeholder="Nguyễn Văn A"
            error={errors.fullName?.message}
            disabled={loading}
            {...register('fullName')}
          />

          <Input
            type="email"
            label="Địa chỉ Email"
            placeholder="name@example.com"
            error={errors.email?.message}
            disabled={loading}
            {...register('email')}
          />

          <Input
            type="text"
            label="Số điện thoại"
            placeholder="0912345678"
            error={errors.phoneNumber?.message}
            disabled={loading}
            {...register('phoneNumber')}
          />

          <Input
            type="password"
            label="Mật khẩu"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={loading}
            {...register('password')}
          />

          <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading} className="mt-2 shadow-brand">
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </Button>
        </form>

        <div className="mt-6 text-xs text-gray-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-brand hover:underline font-bold">
            Đăng nhập
          </Link>
        </div>
      </GlassCard>
    </motion.div>
  );
};
