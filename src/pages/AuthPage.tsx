import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';
import { motion } from 'motion/react';
import { Bus, ShieldCheck, Zap, ArrowRight, User } from 'lucide-react';
import { cn } from '../lib/utils';

export const AuthPage = () => {
  const { user, login, loginWithPhone, loading } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode] = React.useState<'google' | 'phone'>('google');
  const [formData, setFormData] = React.useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const from = (location.state as any)?.from?.pathname || '/';

  React.useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleGoogleLogin = async () => {
    try {
      await login();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show an error notification
        return;
      }
      console.error('Google login failed:', err);
      notify(err.message || 'Login failed. Please try again.', 'error');
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setSubmitting(true);
    try {
      await loginWithPhone(formData.name, formData.phone);
      notify('Signed in successfully!', 'success');
    } catch (err: any) {
      console.error('Phone login failed:', err);
      notify(err.message || 'Phone login failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-secondary/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface-container-lowest p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-2xl border border-outline-variant/10 text-center"
      >
        <div className="bg-primary-fixed w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-lg shadow-primary/10">
          <Bus className="text-primary w-8 h-8 md:w-10 md:h-10" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 md:mb-4">Join the Fleet</h1>
        <p className="text-on-surface-variant text-sm md:text-base mb-8 md:mb-10 leading-relaxed">
          Experience executive travel with real-time booking and secure digital tickets.
        </p>

        <div className="flex bg-surface-container-low p-1.5 rounded-2xl mb-8">
          <button 
            onClick={() => setAuthMode('google')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              authMode === 'google' ? "bg-white shadow-sm text-primary" : "text-outline"
            )}
          >
            Google Login
          </button>
          <button 
            onClick={() => setAuthMode('phone')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              authMode === 'phone' ? "bg-white shadow-sm text-primary" : "text-outline"
            )}
          >
            Phone Login
          </button>
        </div>

        {authMode === 'google' ? (
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-on-surface text-surface py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:bg-primary transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-on-surface/10"
          >
            Continue with Google <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <form onSubmit={handlePhoneLogin} className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest ml-2">Full Name</label>
              <input 
                type="text" required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-surface-container-low p-3 md:p-4 rounded-xl md:rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold text-sm md:text-base"
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest ml-2">Phone Number</label>
              <input 
                type="tel" required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-surface-container-low p-3 md:p-4 rounded-xl md:rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold text-sm md:text-base"
                placeholder="07XX XXX XXX"
              />
            </div>
            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-on-primary py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:bg-primary-container transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-primary/20 mt-4"
            >
              {submitting ? 'Signing in...' : 'Sign in with Phone'} <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        <div className="space-y-4 mt-10">
          {[
            { icon: Zap, text: "Instant Seat Selection" },
            { icon: ShieldCheck, text: "Secure Mobile Payments" },
            { icon: User, text: "Personal Travel Dashboard" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm font-bold text-on-surface-variant bg-surface-container-low p-4 rounded-2xl">
              <item.icon className="w-5 h-5 text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-outline leading-relaxed">
          By continuing, you agree to The Kinetic Ledger's <br />
          <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
};
