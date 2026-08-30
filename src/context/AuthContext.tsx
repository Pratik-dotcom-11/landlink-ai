import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types.js';
import { api } from '../services/api.js';

export interface DemoAccount {
  role: UserRole;
  label: string;
  name: string;
  email: string;
  password: string;
  description: string;
  badgeColor: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    label: 'State Administrator',
    name: 'Dr. Alok Verma',
    email: 'admin@dolr.gov.in',
    password: 'admin123',
    description: 'Full access: manage users, view all documents, analytics, audit logs, configure validation rules.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    role: 'DATA_OPERATOR',
    label: 'Data Operator',
    name: 'Pooja Sharma',
    email: 'operator@dolr.gov.in',
    password: 'operator123',
    description: 'Upload documents, trigger OCR/AI pipeline, review extracted fields, submit for validation.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    role: 'VERIFIER',
    label: 'Revenue Verifier / Tehsildar',
    name: 'Sunil Kumar Banerjee',
    email: 'verifier@dolr.gov.in',
    password: 'verifier123',
    description: 'Review low-confidence records, split-screen document verification, approve/reject/correct fields with audit trail.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    role: 'VIEWER',
    label: 'Public Viewer / Researcher',
    name: 'Ananya Gupta',
    email: 'viewer@dolr.gov.in',
    password: 'viewer123',
    description: 'Read-only access: view authorized records, search cadastral index, view public analytics.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
];

interface AuthContextType {
  user: User | null;
  activeRole: UserRole;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('DATA_OPERATOR');

  useEffect(() => {
    // Check saved user session or default to Data Operator demo user
    const savedToken = localStorage.getItem('dolr_auth_token');
    const savedUser = localStorage.getItem('dolr_user');

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setActiveRole(parsed.role);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    // Default to Data Operator for smooth instant evaluation
    const defaultAcc = DEMO_ACCOUNTS[1];
    const defaultUser: User = {
      id: 'USR-OP-02',
      name: defaultAcc.name,
      email: defaultAcc.email,
      role: 'DATA_OPERATOR',
      department: 'Digital India Land Records Cell',
      designation: 'Senior Cadastral Data Operator',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    };
    setUser(defaultUser);
    setActiveRole('DATA_OPERATOR');
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login(email, password);
      if (res.success && res.data) {
        localStorage.setItem('dolr_auth_token', res.data.token);
        localStorage.setItem('dolr_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setActiveRole(res.data.user.role);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('dolr_auth_token');
    localStorage.removeItem('dolr_user');
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.role === role) || DEMO_ACCOUNTS[0];
    const switchedUser: User = {
      id: `USR-${role.substring(0, 3)}-${Date.now()}`,
      name: acc.name,
      email: acc.email,
      role: role,
      department: role === 'ADMIN' ? 'Department of Land Resources' : role === 'VERIFIER' ? 'Land Revenue & Settlement Wing' : role === 'VIEWER' ? 'Public Policy Research Wing' : 'Digital Land Records Cell',
      designation: acc.label,
      avatarUrl: role === 'ADMIN'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        : role === 'VERIFIER'
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        : role === 'VIEWER'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    };
    setUser(switchedUser);
    setActiveRole(role);
    localStorage.setItem('dolr_user', JSON.stringify(switchedUser));
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole: user ? user.role : activeRole,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
