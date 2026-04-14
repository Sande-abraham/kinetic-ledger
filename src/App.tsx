import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Ticket, 
  ShieldCheck,
  Facebook,
  Twitter,
  Instagram,
  Youtube
} from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { NotificationProvider } from './lib/NotificationContext';
import AppErrorBoundary from './components/AppErrorBoundary';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { BookingPage } from './pages/BookingPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { WalletPage } from './pages/WalletPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { TravelPolicyPage, HelpCenterPage, PrivacyPage, TermsPage } from './pages/PolicyPages';
import { cn } from './lib/utils';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Schedules', path: '/search' },
    { name: 'Live Map', path: '/live-map' },
    { name: 'My Tickets', path: '/my-tickets', protected: true },
    { name: 'Wallet', path: '/wallet', protected: true },
    { name: 'Admin', path: '/admin', adminOnly: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 py-4 md:px-6 md:py-6">
      <div className="max-w-7xl mx-auto bg-surface/80 backdrop-blur-2xl border border-outline-variant/20 rounded-2xl md:rounded-3xl shadow-2xl px-4 py-3 md:px-8 md:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 md:gap-3 group">
          <div className="bg-primary p-2 md:p-2.5 rounded-xl md:rounded-2xl transition-transform group-hover:rotate-12">
            <BusIcon className="text-on-primary w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter text-on-surface">KINETIC<span className="text-primary">LEDGER</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {navLinks.filter(link => (!link.protected || user) && (!link.adminOnly || isAdmin)).map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={cn(
                "text-sm font-bold transition-all hover:text-primary",
                location.pathname === link.path ? "text-primary" : "text-on-surface-variant"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <div className="flex items-center gap-2 md:gap-4 pl-3 md:pl-6 border-l border-outline-variant/20">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-on-surface">{user.displayName}</p>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">{isAdmin ? 'Fleet Admin' : 'Traveler'}</p>
              </div>
              <button onClick={logout} className="p-2 md:p-2.5 bg-surface-container-low text-on-surface-variant rounded-xl hover:bg-error-container hover:text-error transition-all">
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          ) : (
            <Link to="/auth" className="hidden sm:flex bg-on-surface text-surface px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm hover:bg-primary transition-all items-center gap-2">
              <User className="w-4 h-4" /> Login
            </Link>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 md:p-2.5 bg-surface-container-low rounded-xl">
            {isOpen ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <Menu className="w-5 h-5 md:w-6 md:h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-24 left-3 right-3 bg-surface border border-outline-variant/20 rounded-[32px] shadow-2xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          {navLinks.filter(link => (!link.protected || user) && (!link.adminOnly || isAdmin)).map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              onClick={() => setIsOpen(false)}
              className="block text-xl font-black tracking-tight text-on-surface hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
          {!user && (
            <Link to="/auth" onClick={() => setIsOpen(false)} className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
              <User className="w-5 h-5" /> Login / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-surface-container-lowest pt-32 pb-12 px-6 border-t border-outline-variant/10">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
        <div className="space-y-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-2xl">
              <BusIcon className="text-on-primary w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter">KINETIC<span className="text-primary">LEDGER</span></span>
          </Link>
          <p className="text-on-surface-variant leading-relaxed">
            Redefining Northern Uganda's transport landscape with premium executive travel and seamless digital booking.
          </p>
          <div className="flex gap-4">
            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
              <a key={i} href="#" className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all">
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-8">Service Area</h4>
          <ul className="space-y-4 text-on-surface-variant font-medium">
            <li>Kampala Central</li>
            <li>Lira City Terminal</li>
            <li>Gulu Highway</li>
            <li>Karuma Junction</li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-8">Resources</h4>
          <ul className="space-y-4 text-on-surface-variant font-medium">
            <li><Link to="/search" className="hover:text-primary">Bus Schedules</Link></li>
            <li><Link to="/my-tickets" className="hover:text-primary">Track Booking</Link></li>
            <li><Link to="/policy" className="hover:text-primary">Travel Policy</Link></li>
            <li><Link to="/help" className="hover:text-primary">Help Center</Link></li>
          </ul>
        </div>

        <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/10">
          <h4 className="text-lg font-bold mb-4">Support Rating</h4>
          <div className="flex gap-1 mb-4">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />)}
          </div>
          <p className="text-sm text-on-surface-variant mb-6">Rated 4.9/5 by 12,000+ travelers in 2025.</p>
          <div className="space-y-3">
            <a href="tel:0703261600" className="block w-full bg-on-surface text-surface py-3 rounded-xl font-bold text-sm hover:bg-primary transition-all text-center">Call Support</a>
            <a href="https://wa.me/256703261600" target="_blank" rel="noopener noreferrer" className="block w-full bg-secondary-container text-secondary py-3 rounded-xl font-bold text-sm hover:bg-secondary transition-all text-center">WhatsApp Us</a>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-outline-variant/10 gap-6">
        <p className="text-sm text-outline font-medium">© 2026 The Kinetic Ledger. All rights reserved.</p>
        <div className="flex items-center gap-8 text-sm text-outline font-medium">
          <Link to="/privacy" className="hover:text-primary">Privacy</Link>
          <Link to="/terms" className="hover:text-primary">Terms</Link>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure SSL Encryption</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

const Star = ({ className, ...props }: { className?: string; [key: string]: any }) => (
  <svg className={className} {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
  </svg>
);

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppErrorBoundary>
            <div className="min-h-screen bg-surface selection:bg-primary/20 selection:text-primary">
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/booking/:busId" element={<BookingPage />} />
                  <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
                  <Route path="/my-tickets" element={<MyTicketsPage />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/live-map" element={<LiveMapPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/policy" element={<TravelPolicyPage />} />
                  <Route path="/help" element={<HelpCenterPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </AppErrorBoundary>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
