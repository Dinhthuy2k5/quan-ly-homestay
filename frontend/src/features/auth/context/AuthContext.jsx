import React, { useEffect, useState } from 'react';
import { getProfileApi, loginApi, logoutApi, registerApi } from '../api';
import { AuthContext } from './authContextInstance';
import { clearAccessToken, setAccessToken } from '../../../lib/api/accessTokenStore';
import { refreshSessionTokens } from '../../../lib/api/client';
import {
  clearLegacyRefreshToken,
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '../../../lib/api/refreshTokenStore';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getRefreshToken()));

  useEffect(() => {
    // Remove access tokens persisted by the previous frontend implementation.
    localStorage.removeItem('accessToken');
    clearLegacyRefreshToken();
    clearAccessToken();

    const handleSessionExpired = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);

    if (!getRefreshToken()) {
      return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }

    let active = true;
    refreshSessionTokens()
      .then(() => getProfileApi())
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) {
          clearAccessToken();
          clearRefreshToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const login = async ({ email, password }) => {
    const data = await loginApi({ email, password });
    if (data.accessToken && data.refreshToken) {
      setAccessToken(data.accessToken);
      localStorage.removeItem('accessToken');
      setRefreshToken(data.refreshToken);
    }
    try {
      const profile = await getProfileApi();
      setUser(profile);
      return { ...data, user: profile };
    } catch {
      setUser(data.user);
      return data;
    }
  };

  const register = async (payload) => {
    return await registerApi(payload);
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // Bỏ qua lỗi mạng khi logout
      }
    }
    clearAccessToken();
    localStorage.removeItem('accessToken');
    clearRefreshToken();
    setUser(null);
  };

  const refreshProfile = async () => {
    const profile = await getProfileApi();
    setUser(profile);
    return profile;
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshProfile,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
