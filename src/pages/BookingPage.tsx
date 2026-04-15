import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  CheckCircle2, 
  ArrowRight, 
  CreditCard, 
  Smartphone, 
  ShieldCheck,
  Info,
  Calendar,
  Clock,
  Wallet,
  MessageSquare
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  onSnapshot, 
  doc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  updateDoc,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';
import { cn } from '../lib/utils';
import { Bus } from '../types';

const BusVisual = ({ selectedCount, totalCount, bookedCount }: { selectedCount: number, totalCount: number, bookedCount: number }) => {
  const occupancyPercent = ((bookedCount + selectedCount) / totalCount) * 100;
  
  return (
    <div className="relative w-full h-48 mb-12 flex items-center justify-center">
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="relative w-full max-w-md h-32 bg-surface-container-highest rounded-r-[40px] rounded-l-2xl border-4 border-on-surface/10 shadow-2xl overflow-hidden"
      >
        {/* Bus Windows */}
        <div className="absolute top-4 left-4 right-12 h-12 flex gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-1 bg-surface-container-low rounded-md overflow-hidden relative">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: i < (selectedCount + bookedCount) / (totalCount / 8) ? '100%' : '0%' }}
                className="absolute bottom-0 left-0 right-0 bg-primary/40"
              />
            </div>
          ))}
        </div>

        {/* Bus Body Filling */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${occupancyPercent}%` }}
          className="absolute bottom-0 left-0 h-2 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]"
        />

        {/* Bus Details */}
        <div className="absolute bottom-4 left-6 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-on-surface/5 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-on-surface/20" />
          </div>
          <div className="w-8 h-8 rounded-full bg-on-surface/5 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-on-surface/20" />
          </div>
        </div>

        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          <div className="w-1 h-12 bg-on-surface/10 rounded-full" />
        </div>
      </motion.div>

      {/* Floating Labels */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-8 bg-primary text-on-primary px-4 py-2 rounded-full font-bold text-xs shadow-xl"
          >
            {selectedCount} Seats Selected
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const BookingPage = () => {
  const { busId } = useParams();
  const { user, profile } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [bus, setBus] = React.useState<Bus | null>(null);
  const hasNotified = React.useRef(false);

  React.useEffect(() => {
    if (!user && !hasNotified.current) {
      hasNotified.current = true;
      notify('Please login to book a seat', 'info');
      navigate('/auth', { state: { from: location } });
    }
  }, [user, navigate, location, notify]);
  const [selectedSeats, setSelectedSeats] = React.useState<string[]>([]);
  const [step, setStep] = React.useState<'seats' | 'payment'>('seats');
  const [paymentMethod, setPaymentMethod] = React.useState<'MTN' | 'Airtel' | 'Card' | 'Wallet'>('MTN');
  const [customerInfo, setCustomerInfo] = React.useState({ 
    name: profile?.displayName || user?.displayName || '', 
    phone: profile?.phoneNumber || '' 
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!busId) return;
    const unsub = onSnapshot(doc(db, 'buses', busId), (snap) => {
      if (snap.exists()) setBus({ id: snap.id, ...snap.data() } as Bus);
    }, (err) => handleFirestoreError(err, OperationType.GET, `buses/${busId}`));
    return unsub;
  }, [busId]);

  const toggleSeat = (seat: string) => {
    if (bus?.bookedSeats.includes(seat)) return;
    const isSelected = selectedSeats.includes(seat);
    if (!isSelected) {
      notify(`Seat ${seat} selected`, 'success');
    }
    setSelectedSeats(prev => prev.includes(seat) ? prev.filter(s => s !== seat) : [...prev, seat]);
  };

  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [currentBookingId, setCurrentBookingId] = React.useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<'idle' | 'polling' | 'success' | 'failed'>('idle');

  const handleConfirmBooking = async () => {
    if (!user || !bus || selectedSeats.length === 0 || loading || paymentStatus !== 'idle') return;
    if (!customerInfo.phone) {
      notify('Please enter your phone number for payment', 'warning');
      return;
    }

    setLoading(true);
    try {
      const totalPrice = selectedSeats.length * bus.price;

      if (paymentMethod === 'Wallet') {
        if ((profile?.walletBalance || 0) < totalPrice) {
          notify('Insufficient wallet balance. Please top up your wallet.', 'error');
          return;
        }

        // 1. Deduct from wallet
        await updateDoc(doc(db, 'users', user.uid), {
          walletBalance: increment(-totalPrice)
        });

        // 1.5 Record transaction
        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          amount: -totalPrice,
          type: 'payment',
          description: `Ticket booking for ${bus.operator}`,
          createdAt: serverTimestamp()
        });

        // 2. Create Booking (Status: CONFIRMED)
        const bookingData = {
          userId: user.uid,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          busId: bus.id,
          busOperator: bus.operator,
          seatNumbers: selectedSeats,
          totalPrice,
          status: 'confirmed', 
          paymentStatus: 'PAID', 
          paymentMethod: 'Wallet',
          transactionId: `WAL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          createdAt: serverTimestamp(),
          departureTime: bus.departureTime
        };
        
        const docRef = await addDoc(collection(db, 'bookings'), bookingData);
        
        // 3. Update bus seats
        await updateDoc(doc(db, 'buses', bus.id), {
          bookedSeats: arrayUnion(...selectedSeats)
        });

        notify('Payment successful using Kinetic Wallet!', 'success');
        navigate(`/confirmation/${docRef.id}`);
        return;
      }

      const tx_ref = `KINETIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      // 1. Initiate Payment via Backend (STK Push Simulation)
      const payRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedSeats.length * bus.price,
          phoneNumber: customerInfo.phone,
          email: user.email,
          customerName: customerInfo.name,
          tx_ref
        })
      });

      const responseText = await payRes.text();

      if (!payRes.ok) {
        throw new Error(`Server error (${payRes.status}): ${responseText.substring(0, 100) || payRes.statusText}`);
      }

      let payData;
      try {
        payData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid response from server. Expected JSON but received: ${responseText.substring(0, 100)}`);
      }
      
      if (payData.status !== 'success') {
        throw new Error(payData.message || 'Payment initiation failed');
      }

      // 2. Create Booking (Status: PENDING)
      const bookingData = {
        userId: user.uid,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        busId: bus.id,
        busOperator: bus.operator,
        seatNumbers: selectedSeats,
        totalPrice: selectedSeats.length * bus.price,
        status: 'pending', 
        paymentStatus: 'NOT PAID', 
        paymentMethod,
        transactionId: tx_ref,
        createdAt: serverTimestamp(),
        departureTime: bus.departureTime
      };
      
      let docRef;
      try {
        docRef = await addDoc(collection(db, 'bookings'), bookingData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'bookings');
        return;
      }
      setCurrentBookingId(docRef.id);
      
      // 3. Show the "Waiting for PIN" Modal
      setPaymentStatus('polling');
      setShowPaymentModal(true);
      notify(payData.data.processor_response, 'info');

    } catch (err: any) { 
      console.error('Booking process failed:', err);
      notify(err.message || 'Booking failed. Please check your connection or try again.', 'error');
    }
    finally { setLoading(false); }
  };

  // Listen for payment confirmation
  React.useEffect(() => {
    if (!currentBookingId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'bookings', currentBookingId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.paymentStatus === 'PAID' && paymentStatus !== 'success') {
          setPaymentStatus('success');
          notify('Payment confirmed! Your ticket is ready.', 'success');
          
          setTimeout(() => {
            setShowPaymentModal(false);
            setPaymentStatus('idle');
            navigate(`/confirmation/${currentBookingId}`);
          }, 4000);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `bookings/${currentBookingId}`);
    });

    return unsubscribe;
  }, [currentBookingId, navigate, notify]);

  const simulatePaymentSuccess = async () => {
    if (!currentBookingId || !bus) return;
    setLoading(true);
    try {
      // In a real app, this update happens via the Backend Webhook
      await updateDoc(doc(db, 'bookings', currentBookingId), {
        paymentStatus: 'PAID',
        status: 'confirmed'
      });

      await updateDoc(doc(db, 'buses', bus.id), {
        bookedSeats: arrayUnion(...selectedSeats)
      });
    } catch (err) {
      notify('Failed to confirm payment simulation', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!bus) return <div className="pt-40 text-center font-bold">Loading bus details...</div>;

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 md:gap-4 mb-8 md:mb-12">
        <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold transition-all text-sm md:text-base", step === 'seats' ? 'bg-primary text-on-primary' : 'bg-secondary-container text-secondary')}>
          {step === 'payment' ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : '1'}
        </div>
        <div className="h-1 w-8 md:w-12 bg-surface-container-highest rounded-full">
          <div className={cn("h-full bg-secondary transition-all duration-500", step === 'payment' ? 'w-full' : 'w-0')} />
        </div>
        <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold transition-all text-sm md:text-base", step === 'payment' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-outline')}>
          2
        </div>
        <h1 className="text-xl md:text-3xl font-black ml-2 md:ml-4">{step === 'seats' ? 'Select Your Vantage Point' : 'Secure Your Journey'}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7">
          {step === 'seats' ? (
            <div className="bg-on-primary-fixed p-6 md:p-12 rounded-3xl md:rounded-[40px] shadow-2xl">
              <BusVisual 
                selectedCount={selectedSeats.length} 
                totalCount={bus.totalSeats} 
                bookedCount={bus.bookedSeats.length} 
              />
              <div className="max-w-sm mx-auto">
                <div className="flex justify-end mb-12">
                  <div className="w-12 h-12 bg-surface-variant/20 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-surface-variant/40 rounded-full"></div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 md:gap-6">
                  {bus.seatNumbers.map((seat) => {
                    const isBooked = bus.bookedSeats.includes(seat);
                    const isSelected = selectedSeats.includes(seat);
                    return (
                      <button
                        key={seat}
                        disabled={isBooked}
                        onClick={() => toggleSeat(seat)}
                        className={cn(
                          "w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl transition-all flex flex-col items-center justify-center font-bold text-[10px] md:text-xs relative",
                          isBooked ? "bg-error/20 text-error/40 cursor-not-allowed border-none" :
                          isSelected ? "bg-primary text-on-primary ring-2 md:ring-4 ring-primary-fixed/30 scale-110" :
                          "bg-secondary-fixed-dim text-on-secondary-fixed hover:scale-105 border-b-2 md:border-b-4 border-secondary/20"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4 mb-0.5" />}
                        {seat}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-16 flex justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-secondary-fixed-dim rounded-sm"></div>
                    <span className="text-[10px] font-bold text-outline uppercase">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary rounded-sm"></div>
                    <span className="text-[10px] font-bold text-outline uppercase">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-error/20 rounded-sm"></div>
                    <span className="text-[10px] font-bold text-outline uppercase">Booked</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Smartphone className="text-primary" /> Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Full Name</label>
                    <input 
                      type="text" required
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="tel" required
                      value={customerInfo.phone}
                      onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                      placeholder="07XX XXX XXX"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><CreditCard className="text-primary" /> Payment Method</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'MTN', label: 'MTN MoMo', icon: Smartphone },
                    { id: 'Airtel', label: 'Airtel Money', icon: Smartphone },
                    { id: 'Card', label: 'Debit/Credit', icon: CreditCard },
                    { id: 'Wallet', label: 'Kinetic Wallet', icon: Wallet }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={cn(
                        "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                        paymentMethod === m.id ? "border-primary bg-primary/5" : "border-outline-variant/20 hover:border-primary/40"
                      )}
                    >
                      <m.icon className={cn("w-8 h-8", paymentMethod === m.id ? "text-primary" : "text-outline")} />
                      <span className="font-bold text-sm">{m.label}</span>
                      {m.id === 'Wallet' && (
                        <span className="text-[10px] font-black text-primary">{(profile?.walletBalance || 0).toLocaleString()} UGX</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="bg-surface-container-lowest p-6 md:p-10 rounded-3xl md:rounded-[40px] border border-outline-variant/10 shadow-sm sticky top-32">
            <h2 className="text-2xl font-bold mb-8">Trip Summary</h2>
            <div className="space-y-6 mb-10">
              <div className="flex justify-between items-center py-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <BusIcon className="text-primary w-5 h-5" />
                  <span className="text-on-surface-variant font-medium">Operator</span>
                </div>
                <span className="font-bold">{bus.operator}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <Calendar className="text-primary w-5 h-5" />
                  <span className="text-on-surface-variant font-medium">Departure</span>
                </div>
                <span className="font-bold">{format(bus.departureTime.toDate(), 'MMM dd, HH:mm')}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-primary w-5 h-5" />
                  <span className="text-on-surface-variant font-medium">Selected Seats</span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                  {selectedSeats.length > 0 ? selectedSeats.map(s => (
                    <span key={s} className="bg-primary-fixed text-primary text-[10px] font-bold px-2 py-0.5 rounded-md">{s}</span>
                  )) : <span className="text-outline italic">None</span>}
                </div>
              </div>
              <div className="flex justify-between items-center pt-6">
                <span className="text-lg font-bold">Total Amount</span>
                <div className="text-right">
                  <p className="text-4xl font-black text-primary">{(selectedSeats.length * bus.price).toLocaleString()}</p>
                  <p className="text-xs font-bold text-outline">UGX</p>
                </div>
              </div>
            </div>

            {step === 'seats' ? (
              <button
                disabled={selectedSeats.length === 0}
                onClick={() => setStep('payment')}
                className="w-full bg-on-surface text-surface py-5 rounded-2xl font-bold hover:bg-primary transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                Continue to Payment
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="space-y-4">
                <button
                  disabled={loading || !customerInfo.phone}
                  onClick={handleConfirmBooking}
                  className="w-full bg-primary text-on-primary py-5 rounded-2xl font-bold hover:bg-primary-container transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? 'Processing Payment...' : 'Confirm & Pay Now'}
                  {!loading && <ShieldCheck className="w-5 h-5" />}
                </button>
                <button onClick={() => setStep('seats')} className="w-full py-3 text-sm font-bold text-outline hover:text-primary transition-colors">
                  Back to Seat Selection
                </button>
              </div>
            )}
            
            <div className="mt-8 p-4 bg-surface-container-low rounded-2xl flex items-start gap-3">
              <Info className="text-primary w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                By confirming, you agree to The Kinetic Ledger's terms of service. Your seat is reserved instantly upon successful payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Waiting Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface p-10 rounded-[48px] shadow-2xl max-w-md w-full text-center border border-outline-variant/10"
            >
              <AnimatePresence mode="wait">
                {paymentStatus === 'polling' ? (
                  <motion.div 
                    key="polling"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="relative w-24 h-24 mx-auto">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Smartphone className="w-10 h-10 text-primary animate-pulse" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-3xl font-black tracking-tight">Check Your Phone</h2>
                      <p className="text-on-surface-variant font-medium leading-relaxed">
                        We've sent a secure PIN prompt to <span className="text-primary font-bold">{customerInfo.phone}</span>.
                        Please enter your Mobile Money PIN to authorize the <span className="font-bold text-on-surface">{(selectedSeats.length * bus.price).toLocaleString()} UGX</span> payment.
                      </p>
                    </div>

                    <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-outline uppercase tracking-widest">Status</p>
                        <p className="text-sm font-bold animate-pulse">Waiting for PIN entry...</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <a 
                        href="https://wa.me/256703261600" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
                      >
                        <MessageSquare className="w-5 h-5" /> WhatsApp Support
                      </a>

                      <button 
                        onClick={simulatePaymentSuccess}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-secondary-container text-secondary font-bold hover:bg-secondary hover:text-on-secondary transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? 'Processing...' : 'Simulate PIN Entry (Success)'}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                  >
                    <div className="w-24 h-24 bg-primary rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-primary/40">
                      <CheckCircle2 className="w-12 h-12 text-on-primary" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black tracking-tight">Booking Confirmed!</h2>
                      <p className="text-on-surface-variant font-medium">
                        Your seats have been successfully reserved.
                      </p>
                    </div>
                    <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-outline">Booking ID</span>
                        <span className="text-sm font-mono font-bold">{currentBookingId?.substring(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-outline">Amount Paid</span>
                        <span className="text-sm font-bold text-primary">{(selectedSeats.length * bus.price).toLocaleString()} UGX</span>
                      </div>
                    </div>
                    <p className="text-xs text-outline font-medium">Redirecting to your ticket...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
