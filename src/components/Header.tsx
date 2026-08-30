import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext.js';
import { UserRole } from '../types.js';
import { api } from '../services/api.js';
import {
  Shield,
  UserCheck,
  ChevronDown,
  Sparkles,
  Layers,
  FileCheck,
  Database,
  ExternalLink,
  RotateCcw,
  Menu,
  X
} from 'lucide-react';

interface HeaderProps {
  onOpenSwagger?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSwagger,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const { user, activeRole, switchRole } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await api.resetSystem();
      window.location.reload();
    } catch (e) {
      console.error(e);
      setIsResetting(false);
    }
  };

  const activeAccount = DEMO_ACCOUNTS.find((a) => a.role === activeRole) || DEMO_ACCOUNTS[0];

  return (
    <header className="h-12 bg-slate-900 text-white flex items-center justify-between px-3 sm:px-4 border-b border-slate-700 shrink-0 sticky top-0 z-40">
      {/* Left: Mobile Hamburger Toggle, Brand Emblem & Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 lg:hidden border border-slate-700 flex items-center justify-center transition-colors touch-manipulation min-w-[36px] min-h-[36px]"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 text-slate-100" /> : <Menu className="w-4 h-4 text-slate-100" />}
          </button>
        )}

        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0">
          LR
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
            <span className="font-bold">LandLink AI</span>
            <span className="font-normal text-slate-400 text-xs hidden sm:inline">
              | Digitization &amp; Validation
            </span>
          </h1>
          <span className="hidden xl:inline text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
            DoLR • MoRD
          </span>
        </div>
      </div>

      {/* Right: Engine Status, Restart Button, Role Switcher & Operator */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* OCR Engine Status Indicator */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800 px-2.5 py-1 rounded text-xs border border-slate-700/80">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></span>
          <span className="text-slate-300 uppercase tracking-widest text-[10px] font-medium whitespace-nowrap">
            OCR: Online
          </span>
        </div>

        {/* Restart / Reset Process Button */}
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 border border-slate-700 transition-all min-h-[32px]"
          title="Restart digitization pipeline & reset records"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-amber-400 shrink-0 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="text-[11px] hidden sm:inline">Restart</span>
        </button>

        {/* Quick Role Switcher for Testing */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded text-xs font-medium border transition-all bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border-slate-700 text-slate-200 min-h-[32px]"
            title="Switch user role for testing"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <div className="text-left hidden xs:block sm:block">
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                <span className="truncate max-w-[80px] sm:max-w-none">{activeAccount.label.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </span>
            </div>
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 p-2 z-50 animate-in fade-in">
              <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1">
                <p className="text-[11px] font-bold text-slate-200">Role-Based Access (RBAC)</p>
                <p className="text-[10px] text-slate-400">Switch role to test permissions</p>
              </div>
              <div className="space-y-1">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => {
                      switchRole(acc.role);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                      activeRole === acc.role
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span>{acc.label}</span>
                        {activeRole === acc.role && <UserCheck className="w-3 h-3 text-white" />}
                      </div>
                      <div className="text-[10px] text-slate-400">{acc.name}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${acc.badgeColor}`}>
                      {acc.role.substring(0, 5)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operator Profile Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <span className="text-slate-400 hidden lg:inline text-[11px]">
            Officer: <strong className="text-slate-200">{user?.name || 'A. Sharma'}</strong>
          </span>
          <div className="w-7 h-7 bg-slate-700 rounded-full border border-slate-600 flex items-center justify-center text-white text-[11px] font-bold shadow-xs shrink-0">
            {user?.name ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2) : 'AS'}
          </div>
        </div>
      </div>
    </header>
  );
};

