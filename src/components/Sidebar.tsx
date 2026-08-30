import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  CheckSquare,
  Database,
  Search,
  MapPin,
  History,
  Sliders,
  Code2,
  X,
  ShieldAlert
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'upload'
  | 'documents'
  | 'verification'
  | 'records'
  | 'search'
  | 'map'
  | 'audit'
  | 'settings'
  | 'api_docs';

interface SidebarProps {
  currentTab: NavigationTab;
  pendingVerificationCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  pendingVerificationCount = 2,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { activeRole } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (tab: NavigationTab) => {
    if (onCloseMobile) onCloseMobile();
    switch (tab) {
      case 'dashboard': navigate('/dashboard'); break;
      case 'upload': navigate('/documents/upload'); break;
      case 'documents': navigate('/documents'); break;
      case 'verification': navigate('/verification'); break;
      case 'records': navigate('/records'); break;
      case 'search': navigate('/search'); break;
      case 'map': navigate('/map'); break;
      case 'audit': navigate('/audit'); break;
      case 'settings': navigate('/settings'); break;
      case 'api_docs': navigate('/api-docs'); break;
      default: navigate('/dashboard');
    }
  };

  const mainNavItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
    allowedRoles?: string[];
  }> = [
    {
      id: 'verification',
      label: 'Verification Queue',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingVerificationCount,
      badgeColor: 'bg-blue-600 text-white',
      allowedRoles: ['ADMIN', 'VERIFIER', 'DATA_OPERATOR'],
    },
    {
      id: 'dashboard',
      label: 'Global Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'upload',
      label: 'Upload Record',
      icon: <UploadCloud className="w-4 h-4" />,
      allowedRoles: ['ADMIN', 'DATA_OPERATOR'],
    },
    {
      id: 'documents',
      label: 'Documents & OCR',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'records',
      label: 'Land Registry',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'search',
      label: 'Smart Search',
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: 'map',
      label: 'GIS Mapping',
      icon: <MapPin className="w-4 h-4" />,
    },
  ];

  const settingsNavItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    allowedRoles?: string[];
  }> = [
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: <History className="w-4 h-4" />,
      allowedRoles: ['ADMIN', 'VERIFIER', 'DATA_OPERATOR'],
    },
    {
      id: 'settings',
      label: 'Validation Rules',
      icon: <Sliders className="w-4 h-4" />,
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'api_docs',
      label: 'Developer APIs',
      icon: <Code2 className="w-4 h-4" />,
    },
  ];

  const renderNavContent = () => (
    <>
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
          Main Menu
        </div>

        {mainNavItems.map((item) => {
          const isRestricted = item.allowedRoles && !item.allowedRoles.includes(activeRole);
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!isRestricted) handleNavigate(item.id);
              }}
              className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 sm:py-2 rounded text-xs font-medium transition-colors touch-manipulation min-h-[38px] ${
                isActive
                  ? 'bg-blue-100 text-blue-700 font-semibold shadow-xs'
                  : isRestricted
                  ? 'text-slate-400 hover:bg-slate-200/60 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-200 active:bg-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-blue-700' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shadow-xs ${
                    item.badgeColor || 'bg-blue-600 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {isRestricted && (
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 text-slate-500 border border-slate-300">
                  LOCK
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 sm:pt-5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
            Settings &amp; APIs
          </div>

          {settingsNavItems.map((item) => {
            const isRestricted = item.allowedRoles && !item.allowedRoles.includes(activeRole);
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!isRestricted) handleNavigate(item.id);
                }}
                className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 sm:py-2 rounded text-xs font-medium transition-colors touch-manipulation min-h-[38px] ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold shadow-xs'
                    : isRestricted
                    ? 'text-slate-400 hover:bg-slate-200/60 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={isActive ? 'text-blue-700' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {isRestricted && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 text-slate-500 border border-slate-300">
                    LOCK
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Daily Quota / Progress Widget matching High Density */}
      <div className="p-3.5 bg-slate-200/50 border-t border-slate-300">
        <div className="flex justify-between text-[10px] font-bold mb-1.5">
          <span className="text-slate-500 uppercase tracking-wider">DAILY QUOTA</span>
          <span className="text-blue-600 font-mono">84%</span>
        </div>
        <div className="w-full bg-slate-300 h-1 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-1 rounded-full transition-all duration-500" style={{ width: '84%' }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500">
          <span>Batch: #DoLR-2025</span>
          <span>42 / 50 Deeds</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg and up) */}
      <aside className="hidden lg:flex w-56 bg-slate-100 border-r border-slate-200 flex-col shrink-0">
        {renderNavContent()}
      </aside>

      {/* Mobile / Tablet Overlay Drawer (< lg) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <aside className="relative z-50 w-72 max-w-[85vw] bg-slate-100 text-slate-900 border-r border-slate-300 flex flex-col shadow-2xl h-full animate-in slide-in-from-left duration-200">
            <div className="h-12 bg-slate-900 text-white flex items-center justify-between px-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white shadow-xs">
                  LR
                </div>
                <span className="font-bold text-sm">Navigation</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
};

