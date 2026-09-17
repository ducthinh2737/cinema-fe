import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { logout as logoutAction, loginSuccess as loginSuccessAction, setLoading as setLoadingAction, updateUser } from '../store/authSlice';
import type { AuthResponse } from '../types';
import { apiClient } from '../api/client';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);

  const login = async (authData: AuthResponse) => {
    dispatch(loginSuccessAction(authData));
    try {
      const response = await apiClient.get('/users/profile');
      const profile = response.data?.data ?? response.data;
      dispatch(updateUser(profile));
    } catch (err) {
      console.error('Failed to fetch user profile after login:', err);
    }
  };

  const logout = () => {
    dispatch(logoutAction());
  };

  const setAuthLoading = (loadingVal: boolean) => {
    dispatch(setLoadingAction(loadingVal));
  };

  const isAdmin = user?.roles?.includes('Admin') || false;

  return {
    user,
    isAuthenticated,
    loading,
    error,
    isAdmin,
    login,
    logout,
    setAuthLoading,
  };
};
