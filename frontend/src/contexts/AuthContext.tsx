import { createContext, useState, useCallback, useEffect } from 'react';
import api from '../config/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city?: string;
  country?: string;
  dateOfBirth?: string;
  occupation?: string;
  createdAt?: string;
}

interface RegisterProfileData {
  city?: string;
  country?: string;
  dateOfBirth?: string;
  occupation?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  register: (
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    confirmPassword: string,
    profileData?: RegisterProfileData,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const saveToken = useCallback((accessToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }, []);

  const register = useCallback(
    async (
      email: string,
      firstName: string,
      lastName: string,
      password: string,
      confirmPassword: string,
      profileData?: RegisterProfileData,
    ) => {
      const response = await api.post('/auth/register', {
        email,
        firstName,
        lastName,
        password,
        confirmPassword,
        ...profileData,
      });
      const { accessToken, user: userData } = response.data;
      saveToken(accessToken);
      setUser(userData);
    },
    [saveToken],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = response.data;
      saveToken(accessToken);
      setUser(userData);
    },
    [saveToken],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const response = await api.get('/auth/me');
        setToken(storedToken);
        setUser(response.data);
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
