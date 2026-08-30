import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { Sidebar, NavigationTab } from './components/Sidebar.js';
import { DashboardView } from './views/DashboardView.js';
import { UploadDocumentView } from './views/UploadDocumentView.js';
import { DocumentsListView } from './views/DocumentsListView.js';
import { HumanVerificationView } from './views/HumanVerificationView.js';
import { LandRecordsView } from './views/LandRecordsView.js';
import { CadastralSearchView } from './views/CadastralSearchView.js';
import { CadastralMapView } from './views/CadastralMapView.js';
import { AuditTrailView } from './views/AuditTrailView.js';
import { SettingsRulesView } from './views/SettingsRulesView.js';
import { ApiDocsView } from './views/ApiDocsView.js';
import { LoginView } from './views/LoginView.js';
import { api } from './services/api.js';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();

  const fetchPendingCount = async () => {
    try {
      const res = await api.getPendingVerification();
      if (res.success && res.data) {
        setPendingCount(res.data.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile navigation drawer whenever route path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Map current path to tab
  const getTabFromPath = (): NavigationTab => {
    const path = location.pathname;
    if (path.startsWith('/documents/upload')) return 'upload';
    if (path.startsWith('/documents')) return 'documents';
    if (path.startsWith('/verification')) return 'verification';
    if (path.startsWith('/records')) return 'records';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/map')) return 'map';
    if (path.startsWith('/audit')) return 'audit';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/api-docs')) return 'api_docs';
    return 'dashboard';
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      <Header
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          currentTab={getTabFromPath()}
          pendingVerificationCount={pendingCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-slate-50 p-2.5 sm:p-4 min-w-0">
          <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </main>
      </div>
      <footer className="h-7 bg-slate-100 border-t border-slate-300 flex items-center justify-between px-3 sm:px-4 shrink-0 select-none text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-2 sm:gap-3 truncate">
          <span className="truncate">
            Env: <span className="text-blue-600 uppercase font-bold">Prototype</span>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Latency: <span className="font-mono text-slate-700 font-semibold">24ms</span>
          </span>
          <span className="text-slate-300 hidden xs:inline">•</span>
          <span className="hidden xs:inline">
            Build: <span className="font-mono text-slate-700 font-semibold">v0.4.2</span>
          </span>
        </div>
        <div className="text-slate-400 hidden sm:block truncate ml-2">
          DoLR • Digital India Land Records
        </div>
      </footer>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
};

const AppRoutes = () => {
  const navigate = useNavigate();

  // Helper to map old onNavigate calls to new router paths
  const handleNavigate = (tab: any, params?: any) => {
    switch (tab) {
      case 'dashboard': navigate('/dashboard'); break;
      case 'upload': navigate('/documents/upload'); break;
      case 'documents': navigate(params?.id ? `/documents/${params.id}` : '/documents'); break;
      case 'verification': 
        // Handle taskId dynamically in HumanVerificationView
        navigate(params?.taskId ? `/verification?taskId=${params.taskId}` : '/verification'); 
        break;
      case 'records': 
        navigate(params?.recordId ? `/records/${params.recordId}` : '/records'); 
        break;
      case 'search': navigate('/search'); break;
      case 'map': navigate('/map'); break;
      case 'audit': navigate('/audit'); break;
      case 'settings': navigate('/settings'); break;
      case 'api_docs': navigate('/api-docs'); break;
      default: navigate('/dashboard');
    }
  };

  // Wrapper components to extract params
  const DocumentsListViewWrapper = () => {
    const { id } = useParams<{ id: string }>();
    return <DocumentsListView onNavigate={handleNavigate} initialDocumentId={id} />;
  };

  const LandRecordsViewWrapper = () => {
    const { id } = useParams<{ id: string }>();
    return <LandRecordsView onNavigate={handleNavigate} initialRecordId={id} />;
  };

  const HumanVerificationViewWrapper = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const taskId = queryParams.get('taskId') || undefined;
    return <HumanVerificationView onNavigate={handleNavigate} initialTaskId={taskId} />;
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><DashboardView onNavigate={handleNavigate} /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentsListViewWrapper /></ProtectedRoute>} />
      <Route path="/documents/upload" element={<ProtectedRoute><UploadDocumentView onNavigate={handleNavigate} /></ProtectedRoute>} />
      <Route path="/documents/:id" element={<ProtectedRoute><DocumentsListViewWrapper /></ProtectedRoute>} />
      
      <Route path="/records" element={<ProtectedRoute><LandRecordsViewWrapper /></ProtectedRoute>} />
      <Route path="/records/:id" element={<ProtectedRoute><LandRecordsViewWrapper /></ProtectedRoute>} />
      
      <Route path="/verification" element={<ProtectedRoute><HumanVerificationViewWrapper /></ProtectedRoute>} />
      
      <Route path="/search" element={<ProtectedRoute><CadastralSearchView onNavigate={handleNavigate} /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><CadastralMapView onNavigate={handleNavigate} /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><AuditTrailView /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsRulesView /></ProtectedRoute>} />
      <Route path="/api-docs" element={<ProtectedRoute><ApiDocsView /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
