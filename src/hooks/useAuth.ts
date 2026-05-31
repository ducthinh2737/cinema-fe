import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { logout as logoutAction, loginSuccess as loginSuccessAction, setLoading as setLoadingAction } from '../store/authSlice';
import type { AuthResponse } from '../types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);

  const login = (authData: AuthResponse) => {
    dispatch(loginSuccessAction(authData));
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
