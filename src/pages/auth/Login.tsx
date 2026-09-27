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
import type { AuthResponse } from '../../types';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

// Zod Validation Schema
const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập Email').email('Địa chỉ Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập Mật khẩu'),
});

type LoginFields = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, loading, setAuthLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFields) => {
    setAuthLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', data);
      login(response.data);
      showToast('Đăng nhập thành công!', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.';
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
          <LogIn size={18} className="text-brand" /> Chào Mừng Quay Lại
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input
            type="email"
            label="Địa chỉ Email"
            placeholder="name@example.com"
            error={errors.email?.message}
            disabled={loading}
            {...register('email')}
          />

          <div className="flex flex-col text-left">
            <Input
              type="password"
              label="Mật khẩu"
              placeholder="••••••••"
              error={errors.password?.message}
              disabled={loading}
              {...register('password')}
            />
            <div className="flex justify-end mt-1.5">
              <Link
                to="/forgot-password"
                className="text-[10px] text-gray-500 hover:text-brand-gold transition-colors font-bold uppercase tracking-wider"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading} className="mt-2 shadow-brand">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-6 text-xs text-gray-400">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-brand hover:underline font-bold">
            Tạo tài khoản ngay
          </Link>
        </div>
      </GlassCard>
    </motion.div>
  );
};
