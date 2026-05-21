import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import config from '../config/config';
import { request } from '../utils/httpClient';

const TOKEN_STORAGE_KEY = 'token';
const REFRESH_STORAGE_KEY = 'refreshToken';

const AuthContext = createContext();

function decodeToken(token) {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Failed to decode token', error);
    return null;
  }
}

function isDecodedTokenExpired(decoded) {
  if (!decoded || !decoded.exp) {
    return true;
  }
  return decoded.exp * 1000 <= Date.now();
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const accessTokenRef = useRef(localStorage.getItem(TOKEN_STORAGE_KEY));
  const refreshTokenRef = useRef(localStorage.getItem(REFRESH_STORAGE_KEY));

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const profileRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const setProfileState = useCallback((nextProfile) => {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    setProfileState(null);
  }, [setProfileState]);

  const storeTokens = useCallback((accessToken, refreshToken) => {
    if (accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      accessTokenRef.current = accessToken;
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      accessTokenRef.current = null;
    }

    if (refreshToken) {
      localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
      refreshTokenRef.current = refreshToken;
    } else {
      localStorage.removeItem(REFRESH_STORAGE_KEY);
      refreshTokenRef.current = null;
    }
  }, []);

  const attemptRefresh = useCallback(
    async (overrideRefreshToken) => {
      const refreshToken = overrideRefreshToken || refreshTokenRef.current;

      if (!refreshToken) {
        return false;
      }

      try {
        const data = await request(`${config.api.endpoints.auth}/refresh`, {
          method: 'POST',
          body: { refreshToken },
        });

        storeTokens(data.token, data.refreshToken);
        setUser(data.user);
        setProfileState(null);
        return true;
      } catch (error) {
        console.error('Refresh token failed', error);
        clearTokens();
        setUser(null);
        setProfileState(null);
        return false;
      }
    },
    [clearTokens, storeTokens, setProfileState]
  );

  const fetchWithAuth = useCallback(
    async (path, options = {}, retry = true) => {
      let token = accessTokenRef.current;

      if (!token) {
        const refreshed = await attemptRefresh();
        if (!refreshed) {
          throw new Error('Authentication required');
        }
        token = accessTokenRef.current;
      }

      try {
        return await request(path, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        if (error.status === 401 && retry) {
          const refreshed = await attemptRefresh();
          if (refreshed) {
            return fetchWithAuth(path, options, false);
          }
          throw new Error('Session expired. Please log in again.');
        }
        throw error;
      }
    },
    [attemptRefresh]
  );

  const loadProfile = useCallback(
    async (force = false) => {
      if (profileRef.current && !force) {
        return profileRef.current;
      }

      const data = await fetchWithAuth('/api/profile');
      setProfileState(data);

      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          isVerified: data.user.isVerified,
          isAdmin: data.user.isAdmin,
          fullName: data.profile?.fullName || data.user.fullName,
        });
      }

      return data;
    },
    [fetchWithAuth, setProfileState]
  );

  const login = useCallback(
    (session) => {
      if (!session?.token || !session?.refreshToken || !session?.user) {
        throw new Error('Invalid session data received');
      }

      storeTokens(session.token, session.refreshToken);
      setUser(session.user);
      setProfileState(null);
    },
    [storeTokens, setProfileState]
  );

  const logout = useCallback(async () => {
    const refreshToken = refreshTokenRef.current;

    if (refreshToken) {
      try {
        await fetchWithAuth(`${config.api.endpoints.auth}/logout`, {
          method: 'POST',
          body: { refreshToken },
        });
      } catch (error) {
        console.error('Logout request failed', error);
      }
    }

    clearTokens();
    setUser(null);
    setProfileState(null);
  }, [clearTokens, fetchWithAuth, setProfileState]);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      const storedAccess = accessTokenRef.current;
      const storedRefresh = refreshTokenRef.current;
      let sessionEstablished = false;

      if (storedAccess) {
        const decoded = decodeToken(storedAccess);

        if (!isDecodedTokenExpired(decoded)) {
          setUser((current) =>
            current || {
              email: decoded.email,
              isAdmin: decoded.isAdmin,
              isVerified: decoded.isVerified,
            }
          );
          sessionEstablished = true;
        }
      }

      if (!sessionEstablished && storedRefresh) {
        sessionEstablished = await attemptRefresh(storedRefresh);
      }

      if (sessionEstablished) {
        try {
          const profileData = await fetchWithAuth('/api/profile');
          if (profileData && isMounted) {
            setProfileState(profileData);
            if (profileData.user) {
              setUser({
                id: profileData.user.id,
                email: profileData.user.email,
                isVerified: profileData.user.isVerified,
                isAdmin: profileData.user.isAdmin,
                fullName: profileData.profile?.fullName || profileData.user.fullName,
              });
            }
          }
        } catch (error) {
          console.error('Failed to load profile during initialization', error);
        }
      } else {
        clearTokens();
        setUser(null);
        setProfileState(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, [attemptRefresh, fetchWithAuth, clearTokens, setProfileState]);

  const isAuthenticated = !!user;

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchWithAuth,
    loadProfile,
    attemptRefresh,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-cream-50">
          <span className="font-semibold text-gray-700">Preparing your experience...</span>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}