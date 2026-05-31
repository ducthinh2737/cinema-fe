import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users as UsersIcon, Search, Edit3, Trash2, X, AlertTriangle, Loader2, Mail } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import type { User } from '../../types';

export const UsersManagement: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Paging
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 8;

  // CRUD states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    membershipPoints: 0,
    roles: ['Customer'],
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/users', {
        params: {
          search: search || undefined,
          pageNumber: page,
          pageSize: pageSize,
        },
      });
      // Adapt response schema mapping to matches client User entity
      const mapped = (response.data.items || response.data.Items || []).map((item: any) => ({
        userId: item.userId,
        email: item.email,
        fullName: item.fullName,
        phoneNumber: item.phoneNumber,
        isEmailVerified: item.isEmailVerified,
        membershipPoints: item.membershipPoints,
        roles: item.roles || ['Customer'],
      }));
      setUsers(mapped);
      setTotalCount(response.data.totalCount || response.data.TotalCount || 0);
    } catch (error) {
      console.error('Failed to fetch users', error);
      showToast('Không thể tải danh sách người dùng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, page]);

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      membershipPoints: user.membershipPoints,
      roles: user.roles && user.roles.length > 0 ? user.roles : ['Customer'],
    });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    try {
      await apiClient.put(`/users/${selectedUser.userId}`, form);
      showToast('Thông tin người dùng đã được cập nhật.', 'success');
      setIsOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to update user', error);
      showToast(error.response?.data?.Message || 'Lỗi cập nhật thông tin người dùng.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrigger = (id: number) => {
    setUserToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await apiClient.delete(`/users/${userToDelete}`);
      showToast('Đã xóa tài khoản người dùng thành công.', 'success');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi xóa tài khoản người dùng.', 'error');
    }
  };

  const toggleRole = (role: string) => {
    setForm(prev => {
      const exists = prev.roles.includes(role);
      const newRoles = exists 
        ? prev.roles.filter(r => r !== role) 
        : [...prev.roles, role];
      // Keep at least one role
      return { ...prev, roles: newRoles.length > 0 ? newRoles : ['Customer'] };
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <UsersIcon size={20} className="text-brand" /> Quản Lý Người Dùng
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Quản lý tài khoản khách hàng, điểm thành viên và phân quyền hệ thống
          </span>
        </div>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e12]/60 border border-white/5 focus:border-brand rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all font-semibold"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
              <th className="p-4">Chủ Tài Khoản</th>
              <th className="p-4">Thông Tin Liên Hệ</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4">Vai Trò</th>
              <th className="p-4">Điểm Tích Lũy</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-40" /></td>
                  <td className="p-4 text-center"><div className="h-4 bg-white/5 rounded w-16 mx-auto" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                  <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-500 font-bold">
                  Không tìm thấy tài khoản nào.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.userId} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4 font-bold text-white flex flex-col">
                    <span>{user.fullName}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">UID: {user.userId}</span>
                  </td>
                  <td className="p-4 font-sans text-gray-400">
                    <span className="flex items-center gap-1.5 leading-none">
                      <Mail size={10} className="text-gray-600" /> {user.email}
                    </span>
                    {user.phoneNumber && (
                      <span className="block text-[10px] text-gray-500 mt-1.5 font-mono">
                        {user.phoneNumber}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-block ${
                      user.isEmailVerified ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                    }`}>
                      {user.isEmailVerified ? 'Đã xác thực' : 'Chờ xác thực'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map(role => (
                        <span key={role} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          role === 'Admin' ? 'text-brand border-brand/20 bg-brand/5' : 'text-blue-400 border-blue-500/20 bg-blue-500/5'
                        }`}>
                          {role === 'Admin' ? 'Quản Trị Viên' : 'Khách Hàng'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-brand-gold font-mono">
                    {user.membershipPoints.toLocaleString()} Điểm
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer"
                        title="Sửa thông tin"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(user.userId)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer"
                        title="Xóa tài khoản"
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

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-left"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-3">
                Sửa Thông Tin & Phân Quyền Người Dùng
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Input
                  type="text"
                  label="Họ và Tên"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                />

                <Input
                  type="text"
                  label="Số Điện Thoại"
                  value={form.phoneNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />

                <Input
                  type="number"
                  label="Điểm Tích Lũy"
                  value={form.membershipPoints}
                  onChange={(e) => setForm(prev => ({ ...prev, membershipPoints: parseInt(e.target.value) || 0 }))}
                />

                {/* Role Switcher checkboxes */}
                <div className="flex flex-col gap-1.5 text-xs text-left">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">Vai Trò & Quyền Hạn</span>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-2 text-white font-bold select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.roles.includes('Customer')}
                        onChange={() => toggleRole('Customer')}
                        className="rounded bg-[#121216] border-white/10 text-brand focus:ring-0"
                      />
                      Khách Hàng
                    </label>
                    <label className="flex items-center gap-2 text-brand font-bold select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.roles.includes('Admin')}
                        onChange={() => toggleRole('Admin')}
                        className="rounded bg-[#121216] border-white/10 text-brand focus:ring-0"
                      />
                      Quản Trị Viên
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" fullWidth className="shadow-brand font-black" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu Thay Đổi'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121217] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center flex flex-col gap-4 items-center"
            >
              <div className="h-12 w-12 bg-brand/10 border border-brand/20 text-brand rounded-full flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Xóa Tài Khoản</h3>
                <p className="text-xs text-gray-400 mt-2 font-semibold">
                  Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này sẽ khóa quyền đăng nhập của người dùng.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)}>
                  Hủy
                </Button>
                <Button variant="primary" fullWidth onClick={handleDelete} className="bg-brand hover:bg-brand/90 font-black">
                  Xác Nhận Xóa
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
