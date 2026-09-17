import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ShoppingBag,
  Grid,
  Coffee,
  TrendingUp,
  Package,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { apiClient, getImageUrl } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import type { Combo, Product } from '../../types';

// Helper to classify product icons
const getProductIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('bắp') || lower.includes('bơ') || lower.includes('popcorn') || lower.includes('corn')) {
    return '🍿';
  }
  if (
    lower.includes('pepsi') ||
    lower.includes('coca') ||
    lower.includes('nước') ||
    lower.includes('soda') ||
    lower.includes('drink') ||
    lower.includes('cola') ||
    lower.includes('mirinda') ||
    lower.includes('7up') ||
    lower.includes('trà')
  ) {
    return '🥤';
  }
  if (lower.includes('kẹo') || lower.includes('snack') || lower.includes('khoai') || lower.includes('m&m') || lower.includes('bánh')) {
    return '🍫';
  }
  return '🍔';
};

// Helper to determine product size/type label
const getProductDetails = (name: string) => {
  const lower = name.toLowerCase();
  let type = 'Snack';
  let size = 'Standard';

  if (lower.includes('bắp') || lower.includes('popcorn')) {
    type = 'Bắp Rang';
  } else if (lower.includes('pepsi') || lower.includes('coca') || lower.includes('nước') || lower.includes('soda') || lower.includes('7up')) {
    type = 'Nước Ngọt';
  }

  if (lower.includes('lớn') || lower.includes('big') || lower.includes('69oz') || lower.includes('32oz')) {
    size = 'Lớn (L)';
  } else if (lower.includes('vừa') || lower.includes('medium') || lower.includes('44oz') || lower.includes('22oz')) {
    size = 'Vừa (M)';
  } else if (lower.includes('nhỏ') || lower.includes('small') || lower.includes('16oz')) {
    size = 'Nhỏ (S)';
  }

  return { type, size };
};

export const CombosManagement: React.FC = () => {
  const { showToast } = useToast();

  // Sidebar State: 'combos' or 'products'
  const [activeSubTab, setActiveSubTab] = useState<'combos' | 'products'>('combos');

  // Sorting State
  const [sortBy, setSortBy] = useState<'displayOrder' | 'priceAsc' | 'priceDesc'>('displayOrder');

  // Combo States
  const [combos, setCombos] = useState<Combo[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [comboSearch, setComboSearch] = useState('');
  const [comboActiveFilter, setComboActiveFilter] = useState<string>('');
  const [comboPage, setComboPage] = useState(1);
  const [comboTotalCount, setComboTotalCount] = useState(0);
  const comboPageSize = 6;

  // Product States (Ingredients)
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Ingredient picker search (scoped to the combo modal only — must NOT
  // share state with the "Sản phẩm lẻ" tab search, otherwise leaving the
  // modal leaks the query into the products tab and vice-versa).
  const [ingredientSearch, setIngredientSearch] = useState('');

  // Modals and Active states
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [comboForm, setComboForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    price: 0,
    originalPrice: 0,
    discountBadge: '',
    displayOrder: 0,
    isActive: true
  });
  const [comboIngredients, setComboIngredients] = useState<{ productId: number; quantity: number }[]>([]);

  // Combo Modal section state: 'basic' | 'ingredients'
  const [modalSection, setModalSection] = useState<'basic' | 'ingredients'>('basic');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    description: '',
    imageUrl: ''
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'combo' | 'product'>('combo');
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Simulated drag/upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingProduct, setIsDraggingProduct] = useState(false);

  const handleDragOverProduct = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProduct(true);
  };

  const handleDragLeaveProduct = () => {
    setIsDraggingProduct(false);
  };

  const handleDropProduct = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProduct(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChangeProduct = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Fetch Combos
  const fetchCombos = async () => {
    setCombosLoading(true);
    try {
      const response = await apiClient.get<any>('/combos/admin', {
        params: {
          Search: comboSearch || undefined,
          IsActive: comboActiveFilter === 'true' ? true : comboActiveFilter === 'false' ? false : undefined,
          PageNumber: comboPage,
          PageSize: comboPageSize
        }
      });
      const data = response.data?.data ?? response.data;
      setCombos(Array.isArray(data?.items) ? data.items : []);
      setComboTotalCount(data?.totalCount ?? 0);
    } catch (error) {
      console.error('Failed to fetch combos', error);
      showToast('Không thể tải danh sách combo.', 'error');
    } finally {
      setCombosLoading(false);
    }
  };

  // 2. Fetch Products
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await apiClient.get<any>('/combos/admin/products');
      const data = response.data?.data ?? response.data;
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch products', error);
      showToast('Không thể tải danh sách sản phẩm lẻ.', 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, [comboSearch, comboActiveFilter, comboPage]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Compute local stats summaries
  const stats = useMemo(() => {
    const totalCombos = combos.length || 0;
    const activeCombos = combos.filter((c) => c.isActive).length || 0;
    const inactiveCombos = totalCombos - activeCombos;
    const totalProds = products.length || 0;
    const todayRevenue = 1450000; // Mocked

    return { totalCombos, activeCombos, inactiveCombos, totalProds, todayRevenue };
  }, [combos, products]);

  // Client-side sorting for rendering
  const sortedCombos = useMemo(() => {
    const list = [...combos];
    if (sortBy === 'displayOrder') {
      return list.sort((a, b) => a.displayOrder - b.displayOrder);
    }
    if (sortBy === 'priceAsc') {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'priceDesc') {
      return list.sort((a, b) => b.price - a.price);
    }
    return list;
  }, [combos, sortBy]);

  const filteredProducts = useMemo<Product[]>(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Ingredient picker list (modal only) — filtered by its own scoped search
  const filteredIngredientProducts = useMemo<Product[]>(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(ingredientSearch.toLowerCase())
    );
  }, [products, ingredientSearch]);

  const comboTotalPages = useMemo<number>(() => {
    return Math.ceil(comboTotalCount / comboPageSize);
  }, [comboTotalCount, comboPageSize]);

  // Combo Modal Open
  const handleOpenAddCombo = () => {
    setSelectedCombo(null);
    setComboForm({
      name: '',
      description: '',
      imageUrl: '',
      price: 59000,
      originalPrice: 79000,
      discountBadge: '',
      displayOrder: 0,
      isActive: true
    });
    setComboIngredients([]);
    setModalSection('basic');
    setIngredientSearch('');
    setIsComboModalOpen(true);
  };

  const handleOpenEditCombo = (combo: Combo) => {
    setSelectedCombo(combo);
    setComboForm({
      name: combo.name,
      description: combo.description || '',
      imageUrl: combo.imageUrl || '',
      price: combo.price,
      originalPrice: combo.originalPrice || combo.price,
      discountBadge: combo.discountBadge || '',
      displayOrder: combo.displayOrder,
      isActive: combo.isActive
    });
    setComboIngredients(
      (combo.comboItems || []).map((ci) => ({
        productId: ci.productId,
        quantity: ci.quantity
      }))
    );
    setModalSection('basic');
    setIngredientSearch('');
    setIsComboModalOpen(true);
  };

  // Product Modal Open
  const handleOpenAddProduct = () => {
    setSelectedProduct(null);
    setProductForm({
      name: '',
      price: 29000,
      description: '',
      imageUrl: ''
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductForm({
      name: prod.name,
      price: prod.price,
      description: prod.description || '',
      imageUrl: prod.imageUrl || ''
    });
    setIsProductModalOpen(true);
  };

  // Toggle status of Combo
  const handleToggleComboStatus = async (id: number, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await apiClient.patch(`/combos/admin/${id}/toggle-status`, !currentStatus, {
        headers: { 'Content-Type': 'application/json' }
      });
      showToast('Đã cập nhật trạng thái hoạt động của combo.', 'success');
      fetchCombos();
    } catch (error: any) {
      console.error('Failed to toggle combo status', error);
      showToast(error.response?.data?.Message || 'Lỗi khi cập nhật trạng thái.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Toggle status of Product
  const handleToggleProductStatus = async (id: number, currentStatus: boolean, prod: Product) => {
    setTogglingId(id);
    try {
      await apiClient.put(`/combos/admin/products/${id}`, {
        name: prod.name,
        price: prod.price,
        description: prod.description || '',
        imageUrl: prod.imageUrl || '',
        isActive: !currentStatus
      });
      showToast('Đã cập nhật trạng thái hoạt động của sản phẩm.', 'success');
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to toggle product status', error);
      showToast(error.response?.data?.Message || 'Lỗi khi cập nhật trạng thái.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Save Combo
  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comboIngredients.length === 0) {
      showToast('Vui lòng thêm ít nhất một nguyên liệu cho combo.', 'warning');
      setModalSection('ingredients');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: comboForm.name.trim(),
        description: comboForm.description.trim(),
        imageUrl: comboForm.imageUrl.trim() || null,
        price: comboForm.price,
        originalPrice: comboForm.originalPrice || comboForm.price,
        discountBadge: comboForm.discountBadge.trim() || null,
        displayOrder: comboForm.displayOrder,
        isActive: comboForm.isActive,
        comboItems: comboIngredients.map((ci) => ({
          productId: ci.productId,
          quantity: ci.quantity
        }))
      };

      if (selectedCombo) {
        await apiClient.put(`/combos/admin/${selectedCombo.id}`, payload);
        showToast('Đã cập nhật thông tin combo thành công!', 'success');
      } else {
        await apiClient.post('/combos/admin', payload);
        showToast('Đã thêm combo mới thành công!', 'success');
      }
      setIsComboModalOpen(false);
      fetchCombos();
    } catch (error: any) {
      console.error('Failed to save combo', error);
      showToast(error.response?.data?.Message || 'Lỗi khi lưu combo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        price: productForm.price,
        description: productForm.description.trim() || null,
        imageUrl: productForm.imageUrl.trim() || null
      };

      if (selectedProduct) {
        await apiClient.put(`/combos/admin/products/${selectedProduct.id}`, payload);
        showToast('Đã cập nhật sản phẩm lẻ.', 'success');
      } else {
        await apiClient.post('/combos/admin/products', payload);
        showToast('Đã thêm sản phẩm lẻ mới.', 'success');
      }
      setIsProductModalOpen(false);
      fetchProducts();
      fetchCombos(); // Refresh combos to sync ingredient names
    } catch (error: any) {
      console.error('Failed to save product', error);
      showToast(error.response?.data?.Message || 'Lỗi khi lưu sản phẩm.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Delete
  const handleDeleteTrigger = (type: 'combo' | 'product', id: number) => {
    setDeleteType(type);
    setItemToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDeleteId) return;
    try {
      if (deleteType === 'combo') {
        await apiClient.delete(`/combos/admin/${itemToDeleteId}`);
        showToast('Đã xóa combo thành công.', 'success');
        fetchCombos();
      } else {
        await apiClient.delete(`/combos/admin/products/${itemToDeleteId}`);
        showToast('Đã xóa sản phẩm lẻ thành công.', 'success');
        fetchProducts();
        fetchCombos();
      }
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Failed to delete item', error);
      showToast(error.response?.data?.Message || 'Có lỗi xảy ra khi xóa.', 'error');
    }
  };

  // Ingredient Helpers
  const addIngredient = (productId: number) => {
    setComboIngredients((prev) => {
      const exists = prev.find((item) => item.productId === productId);
      if (exists) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeIngredient = (productId: number) => {
    setComboIngredients((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateIngredientQty = (productId: number, change: number) => {
    setComboIngredients((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + change) } : item
        )
    );
  };

  // Simulated image upload drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComboForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComboForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Real-time discount calculations
  const discountStats = useMemo(() => {
    const price = comboForm.price || 0;
    const original = comboForm.originalPrice || 0;
    if (original <= price) return null;
    const savings = original - price;
    const percent = Math.round((savings / original) * 100);
    return { savings, percent };
  }, [comboForm.price, comboForm.originalPrice]);

  return (
    <div className="flex flex-col gap-6 text-left select-none pb-12 animate-fadeIn font-semibold text-gray-300">

      {/* 1. Header & Summary Stats Grid */}
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
            <Coffee size={24} className="text-brand animate-pulse" /> Quản Lý Bắp Nước & Combo
          </h2>
          <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block mt-1">
            Thiết lập danh mục sản phẩm và cấu hình các gói combo bắp nước tối ưu doanh thu rạp chiếu
          </span>
        </div>

        {/* Premium Dashboard Stats widgets */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-24 backdrop-blur-md relative overflow-hidden group transition-colors"
          >
            <div className="absolute right-[-10px] top-[-10px] text-white/5 group-hover:scale-110 transition-transform">
              <ShoppingBag size={72} />
            </div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tổng số Combo</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.totalCombos}</span>
              <span className="text-[9px] text-brand-gold font-bold uppercase">Gói</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-24 backdrop-blur-md relative overflow-hidden group transition-colors"
          >
            <div className="absolute right-[-10px] top-[-10px] text-emerald-500/5 group-hover:scale-110 transition-transform">
              <Check size={72} />
            </div>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Đang kinh doanh</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">{stats.activeCombos}</span>
              <span className="text-[9px] text-emerald-500 uppercase">Hoạt động</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-24 backdrop-blur-md relative overflow-hidden group transition-colors"
          >
            <div className="absolute right-[-10px] top-[-10px] text-red-500/5 group-hover:scale-110 transition-transform">
              <X size={72} />
            </div>
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Tạm khóa</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-400">{stats.inactiveCombos}</span>
              <span className="text-[9px] text-red-500 uppercase">Ngừng bán</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-24 backdrop-blur-md relative overflow-hidden group transition-colors"
          >
            <div className="absolute right-[-10px] top-[-10px] text-brand-gold/5 group-hover:scale-110 transition-transform">
              <Package size={72} />
            </div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sản phẩm đơn</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.totalProds}</span>
              <span className="text-[9px] text-brand-gold font-bold uppercase">Món lẻ</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-brand/20 to-brand-gold/10 border border-brand/25 flex flex-col justify-between h-24 backdrop-blur-md relative overflow-hidden group transition-colors shadow-lg shadow-brand/5"
          >
            <div className="absolute right-[-10px] top-[-10px] text-brand/10 group-hover:scale-110 transition-transform">
              <TrendingUp size={72} />
            </div>
            <span className="text-[10px] text-brand font-black uppercase tracking-wider">Doanh thu hôm nay</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white font-mono">{stats.todayRevenue.toLocaleString()}đ</span>
              <span className="text-[9px] text-brand-gold font-bold">VND</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. Main content area: Sidebar-style navigation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Segmented Control / Navigation Sidebar */}
        <div className="lg:col-span-3 flex lg:flex-col gap-2 bg-[#0e0e12]/40 p-2 rounded-2xl border border-white/5 backdrop-blur-md lg:sticky lg:top-4">
          <button
            onClick={() => setActiveSubTab('combos')}
            className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-3 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e12] ${activeSubTab === 'combos'
              ? 'bg-brand text-white shadow-lg shadow-brand/20'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
          >
            <ShoppingBag size={15} />
            <span>Quản Lý Combo Bắp Nước</span>
          </button>

          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-3 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e12] ${activeSubTab === 'products'
              ? 'bg-brand text-white shadow-lg shadow-brand/20'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
          >
            <Grid size={15} />
            <span>Quản Lý Sản Phẩm Lẻ</span>
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-9 flex flex-col gap-6 min-w-0">

          {/* DYNAMIC COMPONENT 1: COMBOS MANAGEMENT */}
          {activeSubTab === 'combos' && (
            <div className="flex flex-col gap-5">

              {/* Modern Sticky Toolbar */}
              <div className="sticky top-0 z-20 p-3 bg-[#08080c]/85 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-3 shadow-lg shadow-black/40">
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <div className="relative flex-grow md:flex-initial min-w-[200px]">
                    <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm combo..."
                      value={comboSearch}
                      onChange={(e) => { setComboSearch(e.target.value); setComboPage(1); }}
                      className="w-full pl-9 pr-4 py-2 bg-[#121217]/80 border border-white/5 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-xl text-xs text-gray-200 placeholder-gray-500 transition-all font-semibold"
                    />
                  </div>

                  <select
                    value={comboActiveFilter}
                    onChange={(e) => { setComboActiveFilter(e.target.value); setComboPage(1); }}
                    className="px-3 py-2 bg-[#121217]/80 border border-white/5 text-xs text-gray-300 rounded-xl focus:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40 font-semibold cursor-pointer"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="true">Đang bán</option>
                    <option value="false">Ngừng bán</option>
                  </select>

                  <div className="flex items-center gap-1.5 px-3 py-2 bg-[#121217]/80 border border-white/5 rounded-xl text-xs font-semibold">
                    <ArrowUpDown size={12} className="text-gray-500" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-gray-300 focus:outline-none cursor-pointer"
                    >
                      <option value="displayOrder">Thứ tự hiển thị</option>
                      <option value="priceAsc">Giá tăng dần</option>
                      <option value="priceDesc">Giá giảm dần</option>
                    </select>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAddCombo}
                  className="w-full md:w-auto flex items-center justify-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider py-2 rounded-xl shrink-0"
                >
                  <Plus size={13} /> Tạo Combo
                </Button>
              </div>

              {/* Responsive Combo Card Grid */}
              {combosLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: comboPageSize }).map((_, idx) => (
                    <div key={idx} className="h-96 rounded-3xl bg-white/[0.01] border border-white/5 animate-pulse p-4 flex flex-col gap-4">
                      <div className="h-44 bg-white/5 rounded-2xl w-full" />
                      <div className="h-6 bg-white/5 rounded w-2/3" />
                      <div className="h-4 bg-white/5 rounded w-1/2" />
                      <div className="h-10 bg-white/5 rounded-xl w-full mt-auto" />
                    </div>
                  ))}
                </div>
              ) : sortedCombos.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center gap-5 border border-dashed border-white/5 rounded-3xl bg-white/[0.01] backdrop-blur-md">
                  <div className="h-16 w-16 bg-brand/10 border border-brand/20 text-brand rounded-full flex items-center justify-center animate-bounce">
                    <ShoppingBag size={28} />
                  </div>
                  <div className="text-center">
                    <h4 className="text-white text-sm font-black uppercase tracking-wider">
                      {comboSearch || comboActiveFilter ? 'Không tìm thấy combo phù hợp' : 'Chưa có combo bắp nước'}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-bold block mt-1 uppercase">
                      {comboSearch || comboActiveFilter
                        ? 'Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái'
                        : 'Hãy tạo combo bắp nước đầu tiên của bạn để bán tại quầy'}
                    </span>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleOpenAddCombo} className="flex items-center gap-1.5 text-xs font-black uppercase py-2.5 rounded-xl">
                    <Plus size={14} /> Tạo Combo đầu tiên
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {sortedCombos.map((combo) => {
                    const savingsAmount = (combo.originalPrice && combo.originalPrice > combo.price) ? (combo.originalPrice - combo.price) : 0;
                    const savingsPercent = savingsAmount && combo.originalPrice ? Math.round((savingsAmount / combo.originalPrice) * 100) : 0;

                    return (
                      <motion.div
                        key={combo.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                        className={`rounded-3xl border bg-white/[0.01] overflow-hidden flex flex-col h-[400px] relative backdrop-blur-md group transition-colors ${combo.isActive ? 'border-white/5' : 'border-white/5 opacity-70'
                          }`}
                      >
                        {/* Image banner preview block */}
                        <div className="h-44 w-full relative overflow-hidden bg-white/5 shrink-0">
                          <img
                            src={getImageUrl(combo.imageUrl) || 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=300'}
                            alt={combo.name}
                            loading="lazy"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                            {combo.discountBadge && (
                              <span className="text-[9px] font-black bg-brand px-2 py-0.5 rounded-md text-white uppercase tracking-wider">
                                {combo.discountBadge}
                              </span>
                            )}
                            {savingsPercent > 0 && (
                              <span className="text-[9px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Giảm {savingsPercent}%
                              </span>
                            )}
                            {!combo.isActive && (
                              <span className="text-[9px] font-black bg-black/70 border border-white/10 text-gray-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Ngừng bán
                              </span>
                            )}
                          </div>

                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-[9px] font-bold text-gray-400">
                            Thứ tự: {combo.displayOrder}
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-4 flex flex-col flex-grow min-h-0">
                          <h4 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors truncate" title={combo.name}>{combo.name}</h4>
                          <span className="text-[10px] text-gray-500 font-medium block mt-1 line-clamp-2 leading-relaxed">
                            {combo.description || 'Không có mô tả chi tiết.'}
                          </span>

                          {/* Ingredient items pill list */}
                          <div className="mt-4 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                            {combo.comboItems?.map((ci) => {
                              const foundProd = products.find((p) => p.id === ci.productId);
                              return (
                                <span
                                  key={ci.productId}
                                  className="bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-lg text-[9px] text-gray-400 flex items-center gap-1.5 font-bold"
                                >
                                  <div className="h-4 w-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] shrink-0 overflow-hidden">
                                    {foundProd?.imageUrl ? (
                                      <img
                                        src={getImageUrl(foundProd.imageUrl)}
                                        alt={ci.productName}
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span>{getProductIcon(ci.productName)}</span>
                                    )}
                                  </div>
                                  <span>{ci.productName} x{ci.quantity}</span>
                                </span>
                              );
                            })}
                          </div>

                          {/* Price details & Actions Footer */}
                          <div className="mt-auto pt-3 border-t border-white/5 flex items-end justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Giá ưu đãi</span>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-lg font-extrabold text-brand-gold font-mono">{combo.price.toLocaleString()}đ</span>
                                {combo.originalPrice && combo.originalPrice > combo.price && (
                                  <span className="text-[10px] text-gray-500 line-through font-mono">
                                    {combo.originalPrice.toLocaleString()}đ
                                  </span>
                                )}
                              </div>
                              {savingsAmount > 0 && (
                                <span className="text-[9px] text-emerald-400 font-bold">
                                  Tiết kiệm {savingsAmount.toLocaleString()}đ
                                </span>
                              )}
                            </div>

                            {/* CRUD Trigger tools */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Toggle active state */}
                              <button
                                onClick={() => handleToggleComboStatus(combo.id, combo.isActive)}
                                disabled={togglingId === combo.id}
                                className="p-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                title={combo.isActive ? 'Bấm tạm khóa' : 'Bấm mở bán'}
                              >
                                {togglingId === combo.id ? (
                                  <Loader2 size={13} className="animate-spin text-brand" />
                                ) : combo.isActive ? (
                                  <ToggleRight size={18} className="text-emerald-400" />
                                ) : (
                                  <ToggleLeft size={18} className="text-gray-500" />
                                )}
                              </button>

                              <button
                                onClick={() => handleOpenEditCombo(combo)}
                                className="p-1.5 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
                                title="Chỉnh sửa"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                onClick={() => handleDeleteTrigger('combo', combo.id)}
                                className="p-1.5 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Combo Pagination */}
              {comboTotalPages > 1 && (
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mt-2 border-t border-white/5 pt-4">
                  <span>Trang {comboPage} / {comboTotalPages} ({comboTotalCount} combo)</span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={comboPage === 1}
                      onClick={() => setComboPage(prev => Math.max(prev - 1, 1))}
                      className="text-[10px]"
                    >
                      Trước
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={comboPage === comboTotalPages}
                      onClick={() => setComboPage(prev => Math.min(prev + 1, comboTotalPages))}
                      className="text-[10px]"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC COMPONENT 2: PRODUCTS MANAGEMENT */}
          {activeSubTab === 'products' && (
            <div className="flex flex-col gap-5">

              {/* Product toolbar */}
              <div className="sticky top-0 z-20 p-3 bg-[#08080c]/85 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="relative w-full md:w-72">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm lẻ..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#121217]/80 border border-white/5 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-xl text-xs text-gray-200 placeholder-gray-500 transition-all font-semibold"
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAddProduct}
                  className="w-full md:w-auto flex items-center justify-center gap-1.5 shadow-brand text-xs font-black uppercase tracking-wider py-2 rounded-xl shrink-0"
                >
                  <Plus size={13} /> Tạo sản phẩm
                </Button>
              </div>

              {/* Product lists as cards */}
              {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="h-[360px] rounded-3xl bg-white/[0.01] border border-white/5 animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                  <Grid className="text-gray-600 h-10 w-10" />
                  <span className="text-xs text-gray-500 font-bold uppercase">
                    {productSearch ? 'Không tìm thấy sản phẩm phù hợp' : 'Không có sản phẩm đơn lẻ nào'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredProducts.map((prod) => {
                    const { type, size } = getProductDetails(prod.name);
                    return (
                      <motion.div
                        key={prod.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                        className={`rounded-3xl border bg-white/[0.01] overflow-hidden flex flex-col h-[360px] relative backdrop-blur-md group transition-colors ${prod.isActive !== false ? 'border-white/5' : 'border-white/5 opacity-70'}`}
                      >
                        {/* Image banner block */}
                        <div className="h-44 w-full relative overflow-hidden bg-white/5 shrink-0">
                          {prod.imageUrl ? (
                            <img
                              src={getImageUrl(prod.imageUrl)}
                              alt={prod.name}
                              loading="lazy"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-brand/10 to-brand-gold/10 flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-500">
                              <span className="text-4xl">{getProductIcon(prod.name)}</span>
                            </div>
                          )}

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                            <span className="text-[9px] font-black bg-white/10 border border-white/10 px-2 py-0.5 rounded-md text-gray-300 uppercase tracking-wider">
                              {type}
                            </span>
                            <span className="text-[9px] font-black bg-brand-gold/20 border border-brand-gold/20 px-2 py-0.5 rounded-md text-brand-gold uppercase tracking-wider">
                              Size: {size}
                            </span>
                            {prod.isActive === false && (
                              <span className="text-[9px] font-black bg-black/70 border border-white/10 text-gray-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Ngừng bán
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-4 flex flex-col flex-grow min-h-0">
                          <h4 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors truncate" title={prod.name}>
                            {prod.name}
                          </h4>
                          <span className="text-[10px] text-gray-500 font-medium block mt-1 line-clamp-3 leading-relaxed">
                            {prod.description || 'Không có mô tả chi tiết cho sản phẩm.'}
                          </span>

                          {/* Price & Actions Footer */}
                          <div className="mt-auto pt-3 border-t border-white/5 flex items-end justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Đơn giá</span>
                              <span className="text-lg font-extrabold text-brand-gold font-mono">{prod.price.toLocaleString()}đ</span>
                            </div>

                            {/* CRUD Trigger tools */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Toggle active state */}
                              <button
                                onClick={() => handleToggleProductStatus(prod.id, prod.isActive !== false, prod)}
                                disabled={togglingId === prod.id}
                                className="p-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                title={prod.isActive !== false ? 'Bấm tạm khóa' : 'Bấm mở bán'}
                              >
                                {togglingId === prod.id ? (
                                  <Loader2 size={13} className="animate-spin text-brand" />
                                ) : prod.isActive !== false ? (
                                  <ToggleRight size={18} className="text-emerald-400" />
                                ) : (
                                  <ToggleLeft size={18} className="text-gray-500" />
                                )}
                              </button>

                              <button
                                onClick={() => handleOpenEditProduct(prod)}
                                className="p-1.5 bg-white/5 border border-white/5 hover:border-brand-gold text-brand-gold rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
                                title="Chỉnh sửa"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                onClick={() => handleDeleteTrigger('product', prod.id)}
                                className="p-1.5 bg-white/5 border border-white/5 hover:border-brand text-brand rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MULTI-SECTION COMBO CREATOR/EDITOR MODAL */}
      <AnimatePresence>
        {isComboModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-5xl bg-[#09090d] border border-white/10 rounded-3xl p-6 shadow-2xl text-left my-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsComboModalOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer z-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>

              <div className="flex flex-col gap-1 border-b border-white/5 pb-4 mb-5 pr-10">
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={15} className="text-brand animate-pulse" />
                  {selectedCombo ? 'Hiệu chỉnh cấu hình Combo bắp nước' : 'Thiết lập Combo bắp nước mới'}
                </h2>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                  Cấu hình các trường dữ liệu và danh sách sản phẩm cấu thành combo chi tiết
                </span>
              </div>

              {/* Two Column Layout: Left (Form + Navigation), Right (Real-time Preview) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT: Section Form Panels */}
                <div className="lg:col-span-8 flex flex-col gap-5">
                  {/* Step Selector Tab Pills */}
                  <div className="flex border-b border-white/5 pb-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalSection('basic')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${modalSection === 'basic'
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      1. Thông tin cơ bản
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSection('ingredients')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${modalSection === 'ingredients'
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      2. Cấu hình thành phần ({comboIngredients.length})
                    </button>
                  </div>

                  <form onSubmit={handleSaveCombo} className="flex flex-col gap-5">

                    {/* SECTION 1: BASIC INFORMATION */}
                    {modalSection === 'basic' && (
                      <div className="flex flex-col gap-4 animate-fadeIn">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            type="text"
                            label="Tên Combo bắp nước"
                            required
                            placeholder="Ví dụ: Beta Couple Combo, Family Special..."
                            value={comboForm.name}
                            onChange={(e) => setComboForm((prev) => ({ ...prev, name: e.target.value }))}
                          />

                          <Input
                            type="text"
                            label="Nhãn đặc biệt (Badge) - Dành cho Best Seller, Limited..."
                            placeholder="Ví dụ: Limited, Hot, New..."
                            value={comboForm.discountBadge}
                            onChange={(e) => setComboForm((prev) => ({ ...prev, discountBadge: e.target.value }))}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Mô Tả Combo</span>
                          <textarea
                            placeholder="Mô tả các món ăn nước uống trong combo (Ví dụ: 1 Bắp ngọt lớn + 2 Nước ngọt vừa...)"
                            value={comboForm.description}
                            onChange={(e) => setComboForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-3.5 py-2.5 bg-[#121217] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40 font-semibold resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            type="number"
                            label="Giá bán ưu đãi (đ)"
                            required
                            min={0}
                            value={comboForm.price}
                            onChange={(e) => setComboForm((prev) => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                          />

                          <Input
                            type="number"
                            label="Giá gốc chưa giảm (đ)"
                            required
                            min={0}
                            value={comboForm.originalPrice}
                            onChange={(e) => setComboForm((prev) => ({ ...prev, originalPrice: parseInt(e.target.value) || 0 }))}
                          />
                        </div>

                        {comboForm.originalPrice > 0 && comboForm.originalPrice < comboForm.price && (
                          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-2 text-xs">
                            <AlertTriangle size={13} className="text-red-400 shrink-0" />
                            <span className="text-red-400 font-bold">Giá gốc đang thấp hơn giá bán ưu đãi. Vui lòng kiểm tra lại.</span>
                          </div>
                        )}

                        {discountStats && (
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-emerald-400 font-bold">Khuyến mãi được tính tự động:</span>
                            <span className="text-emerald-400 font-black">
                              Tiết kiệm {discountStats.savings.toLocaleString()}đ ({discountStats.percent}%)
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <Input
                            type="number"
                            label="Thứ tự hiển thị"
                            required
                            min={0}
                            value={comboForm.displayOrder}
                            onChange={(e) => setComboForm((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                          />

                          <div className="flex gap-4 items-center pl-2 sm:pt-4">
                            <label className="flex items-center gap-2 text-white font-bold select-none cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={comboForm.isActive}
                                onChange={(e) => setComboForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                className="rounded bg-[#121217] border-white/10 text-brand focus:ring-0 cursor-pointer"
                              />
                              Kích hoạt bán tại quầy
                            </label>
                          </div>
                        </div>

                        {/* Drag and Drop Upload block */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Hình Ảnh Combo</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                            <div
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors ${isDragging ? 'border-brand bg-brand/5' : 'border-white/5 hover:border-white/10 bg-[#121217]'
                                }`}
                            >
                              <input
                                type="file"
                                id="imageUpload"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                <ImageIcon size={28} className="text-gray-500 group-hover:text-white" />
                                <span className="text-[10px] text-gray-300 font-bold uppercase">Kéo thả hoặc tải ảnh lên</span>
                                <span className="text-[8px] text-gray-500">Hỗ trợ JPG, PNG, WEBP</span>
                              </label>
                            </div>

                            <div className="flex flex-col gap-3 justify-center">
                              <span className="text-[9px] text-gray-500 font-bold uppercase">Hoặc nhập trực tiếp URL ảnh:</span>
                              <input
                                type="text"
                                placeholder="https://example.com/image.jpg"
                                value={comboForm.imageUrl}
                                onChange={(e) => setComboForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-[#121217] border border-white/5 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-xl text-xs text-gray-200 placeholder-gray-500 transition-all font-semibold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-4">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setModalSection('ingredients')}
                            className="flex items-center gap-1.5 text-xs font-black uppercase py-2 px-4 rounded-xl border border-white/10"
                          >
                            Tiếp tục cấu hình <ChevronRight size={14} />
                          </Button>
                        </div>

                      </div>
                    )}

                    {/* SECTION 2: PRODUCTS/INGREDIENTS SELECTOR */}
                    {modalSection === 'ingredients' && (
                      <div className="flex flex-col gap-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

                          {/* Left Panel: Available Products List */}
                          <div className="border border-white/5 bg-[#121217]/50 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2 gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold shrink-0">
                                Danh mục sản phẩm lẻ
                              </span>
                              <div className="relative w-44">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                  type="text"
                                  placeholder="Tìm món lẻ..."
                                  value={ingredientSearch}
                                  onChange={(e) => setIngredientSearch(e.target.value)}
                                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#0e0e12] border border-white/5 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg text-[10px] text-gray-200 placeholder-gray-500 transition-all"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                              {filteredIngredientProducts.length === 0 ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-gray-500 text-[10px] font-semibold">
                                  <Search size={16} className="text-gray-600" />
                                  <span>Không tìm thấy sản phẩm nào khớp với "{ingredientSearch}"</span>
                                </div>
                              ) : (
                                filteredIngredientProducts.map((p) => {
                                  const alreadyAdded = comboIngredients.some((ci) => ci.productId === p.id);
                                  return (
                                    <div
                                      key={p.id}
                                      className={`p-2.5 border rounded-xl flex items-center justify-between transition-colors ${alreadyAdded
                                          ? 'bg-brand/5 border-brand/20'
                                          : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                                          {p.imageUrl ? (
                                            <img
                                              src={getImageUrl(p.imageUrl)}
                                              alt={p.name}
                                              loading="lazy"
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <span>{getProductIcon(p.name)}</span>
                                          )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[11px] font-bold text-white leading-tight truncate">{p.name}</span>
                                          <span className="text-[9px] text-gray-500 font-mono mt-0.5">{p.price.toLocaleString()}đ</span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => addIngredient(p.id)}
                                        className="p-1 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-black rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
                                        title="Thêm vào Combo"
                                      >
                                        <Plus size={13} />
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Right Panel: Selected Ingredients */}
                          <div className="border border-white/5 bg-[#121217]/50 rounded-2xl p-4 flex flex-col gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 border-b border-white/5 pb-2 block">
                              Món đã chọn ({comboIngredients.length})
                            </span>

                            {comboIngredients.length === 0 ? (
                              <div className="flex-grow flex flex-col items-center justify-center gap-3 py-10 text-center text-gray-500 font-semibold text-xs border border-dashed border-white/5 rounded-xl bg-[#09090c]/20">
                                <Layers size={20} className="text-gray-600" />
                                <span>Chưa cấu hình món lẻ. Hãy bấm "+" ở cột bên trái để chọn.</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                                {comboIngredients.map((ing) => {
                                  const item = products.find((p) => p.id === ing.productId);
                                  if (!item) return null;

                                  return (
                                    <div
                                      key={ing.productId}
                                      className="p-2 bg-[#0e0e12] border border-white/5 rounded-xl flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                                          {item.imageUrl ? (
                                            <img
                                              src={getImageUrl(item.imageUrl)}
                                              alt={item.name}
                                              loading="lazy"
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <span>{getProductIcon(item.name)}</span>
                                          )}
                                        </div>
                                        <span className="text-[11px] font-bold text-white leading-tight truncate" title={item.name}>{item.name}</span>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center border border-white/5 bg-black/20 rounded-lg overflow-hidden h-7">
                                          <button
                                            type="button"
                                            onClick={() => updateIngredientQty(ing.productId, -1)}
                                            disabled={ing.quantity <= 1}
                                            className="px-2 py-0.5 hover:bg-white/5 text-gray-400 hover:text-white text-[10px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                            aria-label="Giảm số lượng"
                                          >
                                            -
                                          </button>
                                          <span className="px-2 text-[10px] text-white font-black font-mono">{ing.quantity}</span>
                                          <button
                                            type="button"
                                            onClick={() => updateIngredientQty(ing.productId, 1)}
                                            className="px-2 py-0.5 hover:bg-white/5 text-gray-400 hover:text-white text-[10px] font-bold cursor-pointer"
                                            aria-label="Tăng số lượng"
                                          >
                                            +
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => removeIngredient(ing.productId)}
                                          className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-brand transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                          aria-label={`Xóa ${item.name} khỏi combo`}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>

                        <div className="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setModalSection('basic')}
                            className="text-xs font-bold py-2 px-4 rounded-xl border border-white/10"
                          >
                            Quay lại thông tin
                          </Button>

                          <Button
                            type="submit"
                            variant="primary"
                            disabled={saving}
                            className="py-2.5 px-6 shadow-brand text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5"
                          >
                            {saving ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-white" />
                                Đang lưu...
                              </>
                            ) : (
                              'Lưu thông tin Combo'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                  </form>
                </div>

                {/* RIGHT: Live Interactive Preview Card */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold border-b border-white/5 pb-2 block">
                    Giao diện hiển thị khách hàng
                  </span>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col h-[380px] shadow-2xl relative">
                    <div className="h-40 w-full relative overflow-hidden bg-white/5 shrink-0">
                      {comboForm.imageUrl ? (
                        <img
                          src={getImageUrl(comboForm.imageUrl)}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-gray-600 bg-white/[0.01]">
                          <ImageIcon size={32} />
                          <span className="text-[9px] uppercase font-bold">Chưa có ảnh</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        {comboForm.discountBadge && (
                          <span className="text-[9px] font-black bg-brand px-2 py-0.5 rounded-md text-white uppercase tracking-wider">
                            {comboForm.discountBadge}
                          </span>
                        )}
                        {discountStats && (
                          <span className="text-[9px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Giảm {discountStats.percent}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-grow min-h-0">
                      <h4 className="text-sm font-black text-white truncate">
                        {comboForm.name || 'Tên Combo bắp nước'}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-medium block mt-1 line-clamp-2 leading-relaxed">
                        {comboForm.description || 'Mô tả ngắn gọn về combo sẽ xuất hiện ở đây để thu hút khách hàng.'}
                      </span>

                      {/* Pill selections */}
                      <div className="mt-3 flex flex-wrap gap-1.5 max-h-12 overflow-y-auto">
                        {comboIngredients.length === 0 ? (
                          <span className="text-[9px] text-gray-600 italic">Chưa chọn món...</span>
                        ) : (
                          comboIngredients.map((ing) => {
                            const p = products.find((prod) => prod.id === ing.productId);
                            if (!p) return null;
                            return (
                              <span key={ing.productId} className="bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg text-[9px] text-gray-400 flex items-center gap-1.5">
                                <div className="h-3.5 w-3.5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] shrink-0 overflow-hidden">
                                  {p.imageUrl ? (
                                    <img
                                      src={getImageUrl(p.imageUrl)}
                                      alt={p.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>{getProductIcon(p.name)}</span>
                                  )}
                                </div>
                                <span>{p.name} x{ing.quantity}</span>
                              </span>
                            );
                          })
                        )}
                      </div>

                      <div className="mt-auto pt-3 border-t border-white/5 flex items-baseline justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Giá vé đi kèm</span>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-md font-extrabold text-brand-gold font-mono">{(comboForm.price || 0).toLocaleString()}đ</span>
                            {comboForm.originalPrice && comboForm.originalPrice > comboForm.price && (
                              <span className="text-[10px] text-gray-600 line-through font-mono">
                                {comboForm.originalPrice.toLocaleString()}đ
                              </span>
                            )}
                          </div>
                        </div>

                        {discountStats && (
                          <span className="text-[9px] font-black text-emerald-400 shrink-0">
                            Tiết kiệm {discountStats.savings.toLocaleString()}đ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRODUCT DIALOG (ADD / EDIT) */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-left my-8"
            >
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>

              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-3 pr-8 flex items-center gap-2">
                <Sparkles size={15} className="text-brand" />
                {selectedProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>

              <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                <Input
                  type="text"
                  label="Tên sản phẩm"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <Input
                  type="number"
                  label="Đơn giá (đ)"
                  required
                  min={0}
                  value={productForm.price}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                />

                <div className="flex flex-col gap-1.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Mô Tả Sản Phẩm</span>
                  <textarea
                    placeholder="Mô tả dung tích, vị ngọt hoặc xuất xứ..."
                    value={productForm.description}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-[#121217] border border-white/5 text-xs text-gray-200 rounded-xl focus:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40 font-semibold resize-none"
                  />
                </div>

                {/* Drag and Drop Upload block for Product */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Hình Ảnh Sản Phẩm</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    <div
                      onDragOver={handleDragOverProduct}
                      onDragLeave={handleDragLeaveProduct}
                      onDrop={handleDropProduct}
                      className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors ${isDraggingProduct ? 'border-brand bg-brand/5' : 'border-white/5 hover:border-white/10 bg-[#121217]'
                        }`}
                    >
                      <input
                        type="file"
                        id="productImageUpload"
                        accept="image/*"
                        onChange={handleFileChangeProduct}
                        className="hidden"
                      />
                      <label htmlFor="productImageUpload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                        <ImageIcon size={24} className="text-gray-500 group-hover:text-white" />
                        <span className="text-[10px] text-gray-300 font-bold uppercase">Kéo thả hoặc tải ảnh lên</span>
                        <span className="text-[8px] text-gray-500">Hỗ trợ JPG, PNG, WEBP</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 justify-center">
                      {productForm.imageUrl ? (
                        <div className="h-16 w-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5 mx-auto">
                          <img
                            src={getImageUrl(productForm.imageUrl)}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-[9px] text-gray-500 font-bold uppercase text-center block">Chưa có ảnh</span>
                      )}
                      <input
                        type="text"
                        placeholder="Nhập trực tiếp URL ảnh..."
                        value={productForm.imageUrl}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#121217] border border-white/5 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-xl text-xs text-gray-200 placeholder-gray-500 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 mt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    className="w-full py-3.5 shadow-brand text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-white" />
                        Đang lưu dữ liệu...
                      </>
                    ) : (
                      'Lưu sản phẩm đơn lẻ'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE DIALOG */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl text-center"
            >
              <div className="mx-auto w-12 h-12 bg-brand/10 border border-brand/20 text-brand rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={20} />
              </div>

              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                Xác nhận xóa dữ liệu
              </h3>

              <p className="text-[11px] text-gray-400 mb-6 leading-relaxed">
                Bạn có chắc chắn muốn xóa {deleteType === 'combo' ? 'combo bắp nước' : 'sản phẩm lẻ'} này?
                Mọi tham chiếu hiện thời sẽ ngừng hoạt động. Thao tác này không thể khôi phục.
              </p>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-gray-300 border border-white/10"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-brand"
                >
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