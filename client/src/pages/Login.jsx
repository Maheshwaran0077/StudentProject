import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { loginUser, clearError } from '../store/slices/authSlice';
import { Key, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { isAuthenticated, error, loading } = useSelector((state) => state.auth);

  // Parse queries like session expiration and registration success
  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';
  const isRegistered = new URLSearchParams(location.search).get('registered') === 'true';

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      // Return to attempted page or root redirect
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };



  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blobs for modern aesthetics */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-primary-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="relative inline-block mb-3">
            <img 
              src="/assets/rec-logo-text.png" 
              alt="REC Logo" 
              className="mx-auto h-16 object-contain bg-white px-4 py-2.5 rounded-2xl shadow-md border border-slate-200 animate-pulse-slow"
            />
            {/* Signature Mascot overlaid next to the logo for rich UX */}
            <img 
              src="/assets/rec-mascot.png" 
              alt="REC Mascot" 
              className="absolute -right-6 -bottom-3 h-10 w-10 object-contain hover:scale-110 transition-transform cursor-pointer"
              title="REC Support Mascot!"
            />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white font-sans">REC Grievance Portal</h2>
          <p className="mt-2 text-xs text-slate-400">Official College Communication & Grievance Redressal</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-400">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isExpired && !error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 text-sm text-amber-400">
              <AlertCircle size={18} className="shrink-0" />
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {isRegistered && !error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-sm text-emerald-400">
              <AlertCircle size={18} className="shrink-0 text-emerald-500" />
              <span>Registration successful! You can now log in.</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="name@college.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Key size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Sign In'
              )}
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-400 hover:underline">
                Create one
              </Link>
            </p>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
