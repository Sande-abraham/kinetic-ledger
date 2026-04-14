import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Zap, 
  Clock,
  Star,
  MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [search, setSearch] = React.useState({ from: 'Kampala', to: 'Lira', date: new Date().toISOString().split('T')[0] });

  const handleBookingClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      notify('Please sign in to book your seat', 'info');
      navigate('/auth');
    } else {
      document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearch = () => {
    if (!user) {
      notify('Please sign in to search for buses', 'info');
      navigate('/auth');
      return;
    }
    navigate(`/search?from=${search.from}&to=${search.to}&date=${search.date}`);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 opacity-20 pointer-events-none"
        >
          <img 
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
            alt="Premium Bus"
          />
        </motion.div>
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-48 pb-16 md:pb-32 px-4 md:px-6 overflow-hidden isolate">
        {/* Artistic Moving Bus Background */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden select-none">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 15, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            <BusIcon className="w-[800px] h-[800px] rotate-12 text-primary/20" />
          </motion.div>
          
          {/* Decorative Abstract Shapes */}
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-secondary/30 rounded-full blur-[150px]"
          />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-10 relative"
          >
            {/* Artistic Heading Background - High Visibility Glow */}
            <div className="absolute -inset-24 -z-10 opacity-40 blur-[120px] pointer-events-none">
              <div className="w-full h-full bg-gradient-to-tr from-primary via-secondary to-tertiary rounded-full animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-xl px-4 md:px-6 py-2 md:py-2.5 rounded-full border border-primary/10 shadow-xl shadow-primary/5">
              <span className="flex h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary">Next Gen Travel Experience</span>
            </div>
            
            <h1 className="text-4xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] text-on-surface relative">
              The <span className="text-primary relative">
                Future
                <motion.span 
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="absolute bottom-1 md:bottom-2 left-0 h-1.5 md:h-4 bg-primary/20 -z-10"
                />
              </span> of <span className="italic font-serif text-secondary">Travel</span> is Here.
            </h1>
            
            <p className="text-lg md:text-xl text-on-surface-variant max-w-lg leading-relaxed font-medium">
              Experience executive comfort on the Kampala-Lira route. Real-time tracking, digital payments, and premium hospitality.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 pt-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBookingClick} 
                className="bg-primary text-on-primary px-6 md:px-12 py-3.5 md:py-6 rounded-xl md:rounded-[32px] font-black text-base md:text-xl hover:bg-primary-container transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 group"
              >
                Book Your Seat <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </motion.button>
              
              <div className="flex items-center gap-4 px-6">
                <div className="flex -space-x-4">
                  {[1,2,3,4].map(i => (
                    <motion.img 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      src={`https://i.pravatar.cc/150?u=${i}`} 
                      className="w-12 h-12 rounded-full border-4 border-background ring-2 ring-primary/10" 
                      referrerPolicy="no-referrer" 
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-black text-on-surface">12k+ Travelers</p>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Trust Kinetic Ledger</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, type: "spring" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="bg-white/70 backdrop-blur-3xl p-12 rounded-[72px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-white/40 relative z-10" id="booking-widget">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-primary p-3 rounded-2xl">
                  <BusIcon className="text-on-primary w-6 h-6" />
                </div>
                <h2 className="text-4xl font-black tracking-tight">Search Bus</h2>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] ml-2">Departure</label>
                    <div className="relative group">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-primary w-5 h-5 group-focus-within:scale-110 transition-transform" />
                      <select 
                        value={search.from}
                        onChange={e => setSearch({...search, from: e.target.value})}
                        className="w-full bg-surface-container-low/50 pl-14 pr-6 py-5 rounded-3xl border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all font-bold text-lg appearance-none"
                      >
                        <option>Kampala</option>
                        <option>Lira</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] ml-2">Destination</label>
                    <div className="relative group">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary w-5 h-5 group-focus-within:scale-110 transition-transform" />
                      <select 
                        value={search.to}
                        onChange={e => setSearch({...search, to: e.target.value})}
                        className="w-full bg-surface-container-low/50 pl-14 pr-6 py-5 rounded-3xl border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all font-bold text-lg appearance-none"
                      >
                        <option>Lira</option>
                        <option>Kampala</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] ml-2">Travel Date</label>
                  <div className="relative group">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-primary w-5 h-5 group-focus-within:scale-110 transition-transform" />
                    <input 
                      type="date" 
                      value={search.date}
                      onChange={e => setSearch({...search, date: e.target.value})}
                      className="w-full bg-surface-container-low/50 pl-14 pr-6 py-5 rounded-3xl border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all font-bold text-lg"
                    />
                  </div>
                </div>
                <motion.button 
                  whileHover={{ y: -4 }}
                  whileTap={{ y: 0 }}
                  onClick={handleSearch}
                  className="w-full bg-on-surface text-surface py-6 rounded-3xl font-black text-xl hover:bg-primary transition-all mt-6 flex items-center justify-center gap-4 shadow-2xl shadow-on-surface/20"
                >
                  Find Available Buses <ArrowRight className="w-6 h-6" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Map Preview Section */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-on-surface text-surface rounded-[64px] overflow-hidden shadow-[0_48px_96px_-12px_rgba(0,0,0,0.3)] flex flex-col lg:flex-row"
          >
            <div className="p-16 lg:w-1/2 space-y-8">
              <div className="inline-flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Live Fleet Tracking</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-[0.9]">
                Track Your <span className="text-primary">Journey</span> in Real-Time.
              </h2>
              <p className="text-lg text-surface/60 leading-relaxed font-medium">
                Never wonder where your bus is. Our live GPS map shows you exactly where the fleet is, current speeds, and accurate arrival times.
              </p>
              <div className="grid grid-cols-2 gap-8 py-4">
                <div>
                  <p className="text-4xl font-black text-primary">100%</p>
                  <p className="text-xs font-bold text-surface/40 uppercase tracking-widest mt-1">GPS Coverage</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-secondary">Real-time</p>
                  <p className="text-xs font-bold text-surface/40 uppercase tracking-widest mt-1">Updates</p>
                </div>
              </div>
              <Link to="/live-map" className="inline-flex items-center gap-4 bg-primary text-on-primary px-10 py-5 rounded-2xl font-black hover:bg-primary-container transition-all group">
                Open Live Map <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
            <div className="lg:w-1/2 h-[400px] lg:h-auto relative group cursor-pointer overflow-hidden" onClick={() => navigate('/live-map')}>
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200" 
                className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-full border border-white/20 group-hover:scale-110 transition-transform">
                  <div className="bg-primary p-6 rounded-full shadow-2xl">
                    <MapPin className="w-10 h-10 text-on-primary" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-10 left-10 right-10 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <p className="font-bold text-sm">Bus #402: Kampala → Lira</p>
                  </div>
                  <p className="text-xs font-black text-primary uppercase">En Route</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter">Why Choose Kinetic?</h2>
            <p className="text-xl text-on-surface-variant font-medium">Setting the standard for executive travel in Uganda.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: Zap, title: "Instant Booking", desc: "Secure your seat in under 60 seconds with real-time availability.", color: "bg-primary-fixed text-primary" },
              { icon: ShieldCheck, title: "Safe Payments", desc: "Integrated with MTN & Airtel Money for secure, instant transactions.", color: "bg-secondary-container text-secondary" },
              { icon: Clock, title: "On-Time Fleet", desc: "Our buses follow strict schedules to ensure you reach Lira on time.", color: "bg-tertiary-fixed text-tertiary" }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-12 rounded-[56px] bg-white hover:bg-on-surface hover:text-surface transition-all duration-700 border border-outline-variant/10 shadow-xl shadow-black/5"
              >
                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110 group-hover:rotate-6", item.color)}>
                  <item.icon className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black mb-6">{item.title}</h3>
                <p className="text-on-surface-variant group-hover:text-surface/60 leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Route Showcase */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <h2 className="text-5xl font-black mb-4">Popular Routes</h2>
              <p className="text-on-surface-variant text-lg">Daily executive trips across Northern Uganda.</p>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl">
              <button 
                onClick={() => setSearch({ ...search, from: 'Kampala', to: 'Lira' })}
                className={cn("px-6 py-2 rounded-xl font-bold transition-all", search.from === 'Kampala' ? "bg-white shadow-sm" : "text-outline")}
              >
                Kampala → Lira
              </button>
              <button 
                onClick={() => setSearch({ ...search, from: 'Lira', to: 'Kampala' })}
                className={cn("px-6 py-2 rounded-xl font-bold transition-all", search.from === 'Lira' ? "bg-white shadow-sm" : "text-outline")}
              >
                Lira → Kampala
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { time: "06:00 AM", operator: "Ledger Morning", price: "35,000", img: "https://picsum.photos/seed/coach-bus-1/800/600" },
              { time: "09:30 AM", operator: "Kinetic Express", price: "40,000", img: "https://picsum.photos/seed/coach-bus-2/800/600" },
              { time: "02:00 PM", operator: "Lira Premier", price: "35,000", img: "https://picsum.photos/seed/coach-bus-3/800/600" },
              { time: "09:00 PM", operator: "Night Owl", price: "45,000", img: "https://picsum.photos/seed/coach-bus-4/800/600" }
            ].map((route, i) => (
              <div key={i} className="group bg-surface-container-lowest rounded-[40px] overflow-hidden border border-outline-variant/10 shadow-sm hover:shadow-xl transition-all duration-500">
                <div className="relative h-48 overflow-hidden">
                  <img src={route.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] font-bold">4.9</span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{route.time}</p>
                      <h4 className="text-xl font-bold">{route.operator}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">{route.price}</p>
                      <p className="text-[10px] font-bold text-outline uppercase">UGX</p>
                    </div>
                  </div>
                  <Link to="/search" className="w-full py-3 rounded-xl border-2 border-outline-variant/30 font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-on-surface group-hover:text-surface transition-all">
                    Check Seats <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Support Bubble */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2 }}
        className="fixed bottom-6 md:bottom-10 right-6 md:right-10 z-50"
      >
        <a 
          href="https://wa.me/256703261600" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white p-4 md:p-5 rounded-full shadow-2xl hover:scale-110 transition-transform group relative flex items-center justify-center"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-surface animate-bounce" />
          <MessageSquare className="w-6 h-6 md:w-8 md:h-8" />
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-on-surface text-surface px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            24/7 Support Online
          </div>
        </a>
      </motion.div>
    </div>
  );
};
