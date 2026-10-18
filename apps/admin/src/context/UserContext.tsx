// src/context/UserContext.tsx

import {
  createContext,
  useState,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
// @ts-ignore
import { removeAuthCookie } from '@/utils/cookieUtils';

export interface AuthenticatedUser {
  role: string;
  token: string | null;
  userId: string;
  userName: string;
  id?: string;
  email?: string;
}

export interface RolePermissions {
  [section: string]: {
    [module: string]: {
      Create: boolean;
      Edit: boolean;
      Open: boolean;
      Decide: boolean;
    };
  };
}

export interface UserContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  permissions: RolePermissions | null;
  login: (
    role: AuthenticatedUser['role'],
    token: AuthenticatedUser['token'],
    userId: AuthenticatedUser['userId'],
    userName: AuthenticatedUser['userName'],
    email?: string,
  ) => void;
  logout: () => void;
  setUser: Dispatch<SetStateAction<AuthenticatedUser | null>>;
  setPermissions: Dispatch<SetStateAction<RolePermissions | null>>;
  updatePermissions: (newPermissions: RolePermissions) => void;
}

export const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);

  useEffect(() => {
    try {
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('name');
      const email = localStorage.getItem('email');

      if (role && token) {
        setUser({
          role,
          token,
          userId: userId ?? '',
          userName: userName ?? '',
          email: email ?? undefined,
        });
      }

      const savedPermissions = localStorage.getItem('permissions');
      if (savedPermissions) {
        setPermissions(JSON.parse(savedPermissions));
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login: UserContextValue['login'] = (
    role,
    token,
    userId,
    userName,
    email,
  ) => {
    localStorage.setItem('role', role);
    localStorage.setItem('userId', userId);
    localStorage.setItem('name', userName);
    if (token) {
      localStorage.setItem('token', token);
    }
    if (email) {
      localStorage.setItem('email', email);
    }
    setUser({ role, token, userId, userName, email });
  };

  const logout: UserContextValue['logout'] = () => {
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('permissions');

    // Remove shared cookie
    removeAuthCookie();

    setUser(null);
    setPermissions(null);
  };

  //  Helper function to update permissions (and persist)
  const updatePermissions = (newPermissions: RolePermissions) => {
    setPermissions(newPermissions);
    localStorage.setItem('permissions', JSON.stringify(newPermissions));
  };

  const value: UserContextValue = {
    user,
    loading,
    permissions,
    login,
    logout,
    setUser,
    setPermissions,
    updatePermissions,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

