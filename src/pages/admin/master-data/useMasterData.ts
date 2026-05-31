import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../../api/client';
import { useToast } from '../../../contexts/ToastContext';
import type { DataTab, MasterDataItem } from './types';

export const useMasterData = (activeTab: DataTab) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<MasterDataItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats] = useState<Record<string, number>>({});

  // Debounce search effect (500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Load all metadata summary stats from backend
  const loadGlobalStats = useCallback(async () => {
    try {
      const counts: Record<string, number> = {};

      const [genres, halltypes, seattypes, formats, languages, subtitles, ratings] = await Promise.all([
        apiClient.get<any[]>('/genres'),
        apiClient.get<any[]>('/halltypes'),
        apiClient.get<any[]>('/seattypes'),
        apiClient.get<any[]>('/movieformats'),
        apiClient.get<any[]>('/languages'),
        apiClient.get<any[]>('/subtitletypes'),
        apiClient.get<any[]>('/ageratings')
      ]);

      counts.genres = (genres.data || []).length;
      counts.halltypes = (halltypes.data || []).length;
      counts.seattypes = (seattypes.data || []).length;
      counts.formats = (formats.data || []).length;
      counts.languages = (languages.data || []).length;
      counts.subtitles = (subtitles.data || []).length;
      counts.ratings = (ratings.data || []).length;

      setStats(counts);
    } catch (e) {
      console.error('Failed to load global stats:', e);
    }
  }, []);

  // Main data loader function
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'genres' ? '/genres' :
                       activeTab === 'halltypes' ? '/halltypes' :
                       activeTab === 'seattypes' ? '/seattypes' :
                       activeTab === 'formats' ? '/movieformats' :
                       activeTab === 'languages' ? '/languages' :
                       activeTab === 'subtitles' ? '/subtitletypes' :
                       '/ageratings';
      
      const res = await apiClient.get<any[]>(endpoint);
      const rawData = res.data || [];

      const mapped: MasterDataItem[] = rawData.map(item => {
        let id = 0;
        let name = '';
        let description = '';
        let createdAt = new Date().toISOString();
        let isDeleted = false;
        let priceMultiplier: number | undefined = undefined;

        if (activeTab === 'genres') {
          id = item.genreId;
          name = item.genreName;
          description = item.description ?? '';
          createdAt = item.createdAt ?? createdAt;
          isDeleted = item.isDeleted ?? false;
        } else if (activeTab === 'halltypes') {
          id = item.hallTypeId;
          name = item.typeName;
          description = item.description ?? '';
          createdAt = item.createdAt ?? createdAt;
          isDeleted = item.isDeleted ?? false;
        } else if (activeTab === 'seattypes') {
          id = item.seatTypeId;
          name = item.typeName;
          description = item.description ?? '';
          createdAt = item.createdAt ?? createdAt;
          isDeleted = item.isDeleted ?? false;
          priceMultiplier = item.priceMultiplier;
        } else if (activeTab === 'formats') {
          id = item.movieFormatId;
          name = item.formatName;
          description = item.description ?? '';
          createdAt = item.createdAt ?? createdAt;
          isDeleted = item.isDeleted ?? false;
        } else if (activeTab === 'languages') {
          id = item.languageId;
          name = item.languageName;
          description = item.description ?? '';
          createdAt = item.createdAt ?? createdAt;
          isDeleted = item.isDeleted ?? false;
        } else if (activeTab === 'subtitles') {
          id = item.subtitleTypeId;
          name = item.subtitleTypeName;
          description = item.description ?? '';
          createdAt = item.createdAt ?? createdAt;
          isDeleted = item.isDeleted ?? false;
        } else if (activeTab === 'ratings') {
          id = item.ageRatingId;
          name = item.ratingCode;
          description = item.description ?? '';
          createdAt = item.createdAt ?? createdAt;
          isDeleted = item.isDeleted ?? false;
        }

        return {
          id,
          name,
          description,
          createdAt,
          isDeleted,
          priceMultiplier
        };
      });

      setAllItems(mapped);
      // Keep global stats synced
      loadGlobalStats();
    } catch (err) {
      console.error(err);
      showToast('Không thể tải dữ liệu danh mục', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadGlobalStats, showToast]);

  // Load data on tab changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Perform validation on inputs
  const validateItem = useCallback((name: string, editingId: number | null): string | null => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Tên không được để trống';
    }
    if (trimmed.length < 2) {
      return 'Tên phải chứa ít nhất 2 ký tự';
    }

    // Duplicate check
    const duplicate = allItems.some(item => {
      if (editingId !== null && item.id === editingId) return false;
      return item.name.toLowerCase() === trimmed.toLowerCase();
    });

    if (duplicate) {
      return 'Tên này đã tồn tại trong danh sách (không phân biệt chữ hoa/thường)';
    }

    return null;
  }, [allItems]);

  // Create new master data record
  const createItem = useCallback(async (payload: { name: string; description: string; priceMultiplier?: number }) => {
    setLoading(true);
    try {
      const trimmedName = payload.name.trim();
      const validationErr = validateItem(trimmedName, null);
      if (validationErr) {
        showToast(validationErr, 'warning');
        return false;
      }

      if (activeTab === 'genres') {
        await apiClient.post('/genres', {
          genreName: trimmedName,
          description: payload.description.trim()
        });
      } else if (activeTab === 'halltypes') {
        await apiClient.post('/halltypes', {
          typeName: trimmedName,
          description: payload.description.trim()
        });
      } else if (activeTab === 'seattypes') {
        await apiClient.post('/seattypes', {
          typeName: trimmedName,
          priceMultiplier: payload.priceMultiplier || 1.0,
          description: payload.description.trim()
        });
      } else if (activeTab === 'formats') {
        await apiClient.post('/movieformats', {
          formatName: trimmedName,
          description: payload.description.trim()
        });
      } else if (activeTab === 'languages') {
        await apiClient.post('/languages', {
          languageName: trimmedName,
          description: payload.description.trim()
        });
      } else if (activeTab === 'subtitles') {
        await apiClient.post('/subtitletypes', {
          subtitleTypeName: trimmedName,
          description: payload.description.trim()
        });
      } else if (activeTab === 'ratings') {
        await apiClient.post('/ageratings', {
          ratingCode: trimmedName,
          description: payload.description.trim()
        });
      }

      showToast('Thêm mới dữ liệu thành công!', 'success');
      await fetchData();
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.Message || 'Lỗi xảy ra khi thêm mới', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeTab, validateItem, fetchData, showToast]);

  // Update existing master data record
  const updateItem = useCallback(async (id: number, payload: { name: string; description: string; priceMultiplier?: number }) => {
    setLoading(true);
    try {
      const trimmedName = payload.name.trim();
      const validationErr = validateItem(trimmedName, id);
      if (validationErr) {
        showToast(validationErr, 'warning');
        return false;
      }

      const currentItem = allItems.find(i => i.id === id);
      const currentDeletedState = currentItem?.isDeleted ?? false;

      if (activeTab === 'genres') {
        await apiClient.put(`/genres/${id}`, {
          genreName: trimmedName,
          description: payload.description.trim(),
          isDeleted: currentDeletedState
        });
      } else if (activeTab === 'halltypes') {
        await apiClient.put(`/halltypes/${id}`, {
          typeName: trimmedName,
          description: payload.description.trim(),
          isDeleted: currentDeletedState
        });
      } else if (activeTab === 'seattypes') {
        await apiClient.put(`/seattypes/${id}`, {
          typeName: trimmedName,
          priceMultiplier: payload.priceMultiplier || 1.0,
          description: payload.description.trim(),
          isDeleted: currentDeletedState
        });
      } else if (activeTab === 'formats') {
        await apiClient.put(`/movieformats/${id}`, {
          formatName: trimmedName,
          description: payload.description.trim(),
          isDeleted: currentDeletedState
        });
      } else if (activeTab === 'languages') {
        await apiClient.put(`/languages/${id}`, {
          languageName: trimmedName,
          description: payload.description.trim(),
          isDeleted: currentDeletedState
        });
      } else if (activeTab === 'subtitles') {
        await apiClient.put(`/subtitletypes/${id}`, {
          subtitleTypeName: trimmedName,
          description: payload.description.trim(),
          isDeleted: currentDeletedState
        });
      } else if (activeTab === 'ratings') {
        await apiClient.put(`/ageratings/${id}`, {
          ratingCode: trimmedName,
          description: payload.description.trim(),
          isDeleted: currentDeletedState
        });
      }

      showToast('Cập nhật dữ liệu thành công!', 'success');
      await fetchData();
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.Message || 'Lỗi xảy ra khi cập nhật', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeTab, allItems, validateItem, fetchData, showToast]);

  // Soft delete / Toggle active status
  const toggleItemDeleteStatus = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const itemToUpdate = allItems.find(i => i.id === id);
      if (!itemToUpdate) return false;

      const nextDeletedState = !itemToUpdate.isDeleted;

      if (activeTab === 'genres') {
        await apiClient.put(`/genres/${id}`, {
          genreName: itemToUpdate.name,
          description: itemToUpdate.description,
          isDeleted: nextDeletedState
        });
      } else if (activeTab === 'halltypes') {
        await apiClient.put(`/halltypes/${id}`, {
          typeName: itemToUpdate.name,
          description: itemToUpdate.description,
          isDeleted: nextDeletedState
        });
      } else if (activeTab === 'seattypes') {
        await apiClient.put(`/seattypes/${id}`, {
          typeName: itemToUpdate.name,
          priceMultiplier: itemToUpdate.priceMultiplier || 1.0,
          description: itemToUpdate.description,
          isDeleted: nextDeletedState
        });
      } else if (activeTab === 'formats') {
        await apiClient.put(`/movieformats/${id}`, {
          formatName: itemToUpdate.name,
          description: itemToUpdate.description,
          isDeleted: nextDeletedState
        });
      } else if (activeTab === 'languages') {
        await apiClient.put(`/languages/${id}`, {
          languageName: itemToUpdate.name,
          description: itemToUpdate.description,
          isDeleted: nextDeletedState
        });
      } else if (activeTab === 'subtitles') {
        await apiClient.put(`/subtitletypes/${id}`, {
          subtitleTypeName: itemToUpdate.name,
          description: itemToUpdate.description,
          isDeleted: nextDeletedState
        });
      } else if (activeTab === 'ratings') {
        await apiClient.put(`/ageratings/${id}`, {
          ratingCode: itemToUpdate.name,
          description: itemToUpdate.description,
          isDeleted: nextDeletedState
        });
      }

      showToast(
        nextDeletedState ? 'Đã tạm ngưng sử dụng dữ liệu thành công' : 'Đã kích hoạt lại dữ liệu thành công',
        'success'
      );
      await fetchData();
      return true;
    } catch (err) {
      console.error(err);
      showToast('Không thể thay đổi trạng thái hoạt động của dữ liệu', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeTab, allItems, fetchData, showToast]);

  // Search & filter computed memo
  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase().trim();
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [allItems, debouncedSearch]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, page, pageSize]);

  return {
    items: paginatedItems,
    allItems: filteredItems, // For checks and exports
    loading,
    searchText,
    setSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalRecords: filteredItems.length,
    stats,
    createItem,
    updateItem,
    toggleItemDeleteStatus,
    fetchData
  };
};
