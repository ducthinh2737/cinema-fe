import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { tokenStorage } from '../../utils/token';
import { loginSuccess, logout, updateUser } from '../../store/authSlice';
import { apiClient } from '../../api/client';

interface DecodedToken {
  exp: number;
  [key: string]: any;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

const decodeJwtAndMapUser = (token: string) => {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    
    // Extract userId (Microsoft claim or fallback standard sub/nameid)
    const userIdRaw = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || decoded.sub || decoded.nameid;
    const userId = userIdRaw ? parseInt(userIdRaw) : 0;
    
    // Extract email
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || decoded.email || '';
    
    // Extract name
    const fullName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || decoded.unique_name || decoded.name || '';
    
    // Extract roles
    const rolesClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role || decoded.roles;
    const roles = Array.isArray(rolesClaim) 
      ? rolesClaim 
      : rolesClaim 
        ? [rolesClaim] 
        : [];
        
    return { userId, email, fullName, roles, exp: decoded.exp };
  } catch (error) {
    console.error('JWT parse error during session hydration:', error);
    return null;
  }
};

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#060608] z-[9999] flex flex-col items-center justify-center">
      {/* Animated Glowing Ring Background */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-brand/10 blur-[120px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-brand-gold/5 blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="relative w-20 h-20 rounded-full border-2 border-white/5 border-t-brand border-r-brand/40 flex items-center justify-center shadow-[0_0_40px_rgba(229,9,20,0.15)]"
        >
          <div className="absolute w-16 h-16 rounded-full border border-white/5 border-b-brand-gold border-l-brand-gold/40 animate-[spin_1.5s_linear_infinite_reverse]" />
          <Film size={28} className="text-brand animate-pulse" />
        </motion.div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.25em]">
            Cinematic Portal
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest animate-pulse">
            Verifying Secure Session...
          </span>
        </div>
      </div>
    </div>
  );
};

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get('/users/profile');
        const profile = response.data?.data ?? response.data;
        dispatch(updateUser(profile));
      } catch (err) {
        console.error('Failed to fetch user profile in AuthGuard:', err);
      }
    };

    const initializeAuth = async () => {
      const token = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      if (!token || !refreshToken) {
        dispatch(logout());
        setLoading(false);
        return;
      }

      const decoded = decodeJwtAndMapUser(token);
      if (!decoded) {
        dispatch(logout());
        setLoading(false);
        return;
      }

      // Check if token is expired or close to expiring (within 30 seconds)
      const bufferSeconds = 30;
      const isExpired = Date.now() >= (decoded.exp * 1000 - bufferSeconds * 1000);

      if (!isExpired) {
        // Hydrate Redux Auth slice
        dispatch(loginSuccess({
          userId: decoded.userId,
          accessToken: token,
          refreshToken: refreshToken,
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          email: decoded.email,
          fullName: decoded.fullName,
          roles: decoded.roles,
        }));
        fetchUserProfile();
        setLoading(false);
        return;
      }

      // If expired, attempt silent token refresh
      try {
        const response = await apiClient.post('/auth/refresh-token', {
          refreshToken: refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        tokenStorage.setTokens(newAccessToken, newRefreshToken);

        const newDecoded = decodeJwtAndMapUser(newAccessToken);
        if (newDecoded) {
          dispatch(loginSuccess({
            userId: newDecoded.userId,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresAt: new Date(newDecoded.exp * 1000).toISOString(),
            email: newDecoded.email,
            fullName: newDecoded.fullName,
            roles: newDecoded.roles,
          }));
          fetchUserProfile();
        } else {
          dispatch(logout());
        }
      } catch (error) {
        console.error('Session expired. Silent authentication failed:', error);
        dispatch(logout());
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
};
