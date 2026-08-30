import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext.js';
import { ShieldCheck, User as UserIcon, Lock, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid credentials or unauthorized access.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6 items-center">
        {/* Left side: Login Form */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">DoLR Land Portal</h1>
                <p className="text-xs text-slate-500 font-medium">Digital India Land Records</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm transition-shadow"
                    placeholder="officer@dolr.gov.in"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm transition-shadow"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {isLoading ? 'Authenticating...' : 'Secure Sign In'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
          <div className="px-5 sm:px-8 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 text-center">
            Authorized Personnel Only • Government of India
          </div>
        </div>

        {/* Right side: Demo Accounts Info */}
        <div className="bg-slate-100 rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
            Available Demo Accounts
          </h2>
          <div className="space-y-3">
            {DEMO_ACCOUNTS.map((acc, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-white rounded border border-slate-200 hover:border-blue-400 cursor-pointer transition-colors"
                onClick={() => handleDemoLogin(acc.email, acc.password)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-900 text-sm">{acc.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${acc.badgeColor}`}>
                    {acc.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mb-2">{acc.description}</div>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded">
                  <span className="truncate"><strong className="text-slate-400 font-sans text-[10px] uppercase">User:</strong> {acc.email}</span>
                  <span><strong className="text-slate-400 font-sans text-[10px] uppercase">Pass:</strong> {acc.password}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
