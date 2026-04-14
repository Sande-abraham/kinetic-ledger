import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  Clock, 
  Users, 
  ArrowRight, 
  Filter,
  MapPin,
  Calendar,
  Star
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Bus } from '../types';

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [loading, setLoading] = React.useState(true);

  const from = searchParams.get('from') || 'Kampala';
  const to = searchParams.get('to') || 'Lira';

  React.useEffect(() => {
    const q = query(collection(db, 'buses'), where('route', '==', `${from}-${to}`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'buses'));

    return unsubscribe;
  }, [from, to]);

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
        <div>
          <div className="flex items-center gap-3 text-primary font-bold mb-2">
            <MapPin className="w-5 h-5" />
            <span>{from} → {to}</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight">Available Schedules</h1>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl">
          <div className="flex items-center gap-2 px-4 py-2 border-r border-outline-variant/20">
            <Calendar className="w-4 h-4 text-outline" />
            <span className="text-sm font-bold">{format(new Date(), 'MMM dd, yyyy')}</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold hover:bg-surface-container rounded-xl transition-all">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-surface-container-low rounded-[40px] animate-pulse" />)}
        </div>
      ) : buses.length === 0 ? (
        <div className="text-center py-32 bg-surface-container-low rounded-[40px]">
          <BusIcon className="w-20 h-20 text-outline mx-auto mb-6 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">No buses found for this route</h2>
          <p className="text-on-surface-variant">Try selecting a different date or route.</p>
          <Link to="/" className="inline-block mt-8 text-primary font-bold hover:underline">Back to Search</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {buses.map((bus) => (
            <div key={bus.id} className="group bg-surface-container-lowest p-8 md:p-10 rounded-[40px] border border-outline-variant/10 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col md:flex-row items-center gap-10">
              <div className="relative w-full md:w-64 h-48 rounded-[32px] overflow-hidden transition-transform group-hover:scale-105 shrink-0">
                <img 
                  src={bus.imageUrl || `https://picsum.photos/seed/${bus.operator.replace(/\s+/g, '-').toLowerCase()}/800/600`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  alt={bus.operator}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-bold">4.8</span>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                <div>
                  <p className="text-xs font-bold text-outline uppercase tracking-widest mb-2">Operator</p>
                  <h3 className="text-2xl font-bold">{bus.operator}</h3>
                  <p className="text-sm text-on-surface-variant mt-1">Executive Class • AC</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-outline uppercase tracking-widest mb-2">Departure</p>
                  <div className="flex items-center gap-2">
                    <Clock className="text-primary w-5 h-5" />
                    <span className="text-xl font-black">{format(bus.departureTime.toDate(), 'hh:mm a')}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{format(bus.departureTime.toDate(), 'EEEE, MMM dd')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-outline uppercase tracking-widest mb-2">Availability</p>
                  <div className="flex items-center gap-2">
                    <Users className="text-primary w-5 h-5" />
                    <span className="text-xl font-black">{bus.totalSeats - bus.bookedSeats.length} Seats Left</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {bus.seatNumbers.slice(0, 10).map(s => (
                      <div 
                        key={s} 
                        className={cn(
                          "w-3 h-3 rounded-[2px]",
                          bus.bookedSeats.includes(s) ? "bg-error/20" : "bg-secondary-fixed-dim"
                        )} 
                      />
                    ))}
                    <span className="text-[10px] text-outline font-bold">...</span>
                  </div>
                </div>
              </div>

              <div className="text-center md:text-right w-full md:w-auto border-t md:border-t-0 md:border-l border-outline-variant/10 pt-8 md:pt-0 md:pl-10">
                <p className="text-xs font-bold text-outline uppercase tracking-widest mb-1">Price</p>
                <p className="text-4xl font-black text-primary mb-6">{bus.price.toLocaleString()}<span className="text-sm ml-1 text-outline">UGX</span></p>
                <Link 
                  to={`/booking/${bus.id}`}
                  className="inline-flex items-center gap-3 bg-on-surface text-surface px-8 py-4 rounded-2xl font-bold hover:bg-primary transition-all shadow-lg"
                >
                  Select Seats <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
