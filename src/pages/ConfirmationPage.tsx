import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Download, ArrowRight, Calendar, Clock, MapPin, Bus as BusIcon, CreditCard, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Booking, Bus } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { LiveMap } from '../components/LiveMap';

export const ConfirmationPage = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [bus, setBus] = React.useState<Bus | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  const ticketRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!bookingId) return;
    return onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
      if (snap.exists()) {
        const bookingData = { id: snap.id, ...snap.data() } as Booking;
        setBooking(bookingData);
        
        // Fetch associated bus for live tracking
        onSnapshot(doc(db, 'buses', bookingData.busId), (busSnap) => {
          if (busSnap.exists()) setBus({ id: busSnap.id, ...busSnap.data() } as Bus);
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `bookings/${bookingId}`));
  }, [bookingId]);

  const handleDownloadPDF = async () => {
    if (!ticketRef.current || !booking) return;
    setDownloading(true);
    try {
      const element = ticketRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Remove shadows and backdrop filters which cause issues with html2canvas and modern color functions
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            
            // Force remove box-shadow and backdrop-filter
            el.style.boxShadow = 'none';
            el.style.backdropFilter = 'none';
            el.style.setProperty('-webkit-backdrop-filter', 'none');
            
            // Force standard colors for common classes to avoid oklab/oklch issues
            if (el.classList.contains('bg-primary')) el.style.backgroundColor = '#0040a1';
            if (el.classList.contains('text-primary')) el.style.color = '#0040a1';
            if (el.classList.contains('bg-surface-container-low')) el.style.backgroundColor = '#f2f4f6';
            if (el.classList.contains('bg-surface-container-lowest')) el.style.backgroundColor = '#ffffff';
            if (el.classList.contains('text-outline')) el.style.color = '#737785';
            if (el.classList.contains('border-outline-variant/10')) el.style.borderColor = '#c3c6d6';
            if (el.classList.contains('border-outline-variant/30')) el.style.borderColor = '#c3c6d6';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`KineticLedger-Ticket-${booking.id.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (!booking) return <div className="pt-40 text-center font-bold">Loading your ticket...</div>;

  return (
    <div className="pt-24 md:pt-32 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      <motion.div 
        ref={ticketRef}
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-surface-container-lowest rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl border border-outline-variant/10"
      >
        <div className="bg-primary p-6 md:p-12 text-on-primary text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10"><BusIcon className="w-32 h-32 md:w-48 md:h-48 rotate-12" /></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 backdrop-blur-md"><CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" /></div>
            <h1 className="text-2xl md:text-4xl font-black mb-2 md:mb-3">Booking Confirmed!</h1>
            <p className="text-primary-fixed/80 text-sm md:text-lg">Your seat is secured. Get ready for an executive journey.</p>
          </div>
        </div>
        <div className="p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-xs font-bold text-outline uppercase mb-1">Ticket ID</p><p className="font-bold font-mono text-primary">{booking.id.substring(0, 12).toUpperCase()}</p></div>
                <div className="text-right"><p className="text-xs font-bold text-outline uppercase mb-1">Status</p><span className="bg-secondary-container text-secondary text-[10px] font-black px-3 py-1 rounded-full uppercase">{booking.paymentStatus}</span></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl"><BusIcon className="text-primary w-6 h-6" /><div><p className="text-xs text-outline font-bold uppercase">Operator</p><p className="font-bold">{booking.busOperator}</p></div></div>
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl"><MapPin className="text-primary w-6 h-6" /><div><p className="text-xs text-outline font-bold uppercase">Route</p><p className="font-bold">Kampala → Lira</p></div></div>
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl"><Clock className="text-primary w-6 h-6" /><div><p className="text-xs text-outline font-bold uppercase">Departure</p><p className="font-bold">{format(booking.departureTime.toDate(), 'MMMM dd, yyyy • HH:mm')}</p></div></div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-10 bg-surface-container-low rounded-[40px] border-2 border-dashed border-outline-variant/30">
              <div className="bg-white p-6 rounded-3xl shadow-lg mb-6"><QRCodeSVG value={booking.id} size={180} /></div>
              <p className="text-xs font-bold text-outline uppercase mb-4">Boarding Pass</p>
              <div className="flex flex-wrap gap-2 justify-center">{booking.seatNumbers.map(s => <span key={s} className="bg-primary text-on-primary font-black px-4 py-2 rounded-xl text-lg shadow-lg shadow-primary/20">{s}</span>)}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-outline-variant/10">
            <div className="flex items-center gap-3"><CreditCard className="text-primary w-5 h-5" /><div><p className="text-[10px] font-bold text-outline uppercase">Payment</p><p className="text-sm font-bold">{booking.paymentMethod} • {booking.totalPrice.toLocaleString()} UGX</p></div></div>
            <div className="flex items-center gap-3"><Calendar className="text-primary w-5 h-5" /><div><p className="text-[10px] font-bold text-outline uppercase">Booked On</p><p className="text-sm font-bold">{format(booking.createdAt.toDate(), 'MMM dd, yyyy')}</p></div></div>
            <div className="flex items-center gap-3"><CheckCircle2 className="text-primary w-5 h-5" /><div><p className="text-[10px] font-bold text-outline uppercase">Transaction ID</p><p className="text-sm font-bold font-mono">{booking.transactionId}</p></div></div>
          </div>
          <div className="mt-12 flex flex-col md:flex-row gap-4 no-print">
            <button 
              onClick={handleDownloadPDF} 
              disabled={downloading}
              className="flex-1 bg-surface-container-highest text-on-surface py-5 rounded-2xl font-bold hover:bg-outline-variant/20 transition-all flex items-center justify-center gap-3"
            >
              {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {downloading ? 'Generating PDF...' : 'Download Ticket (PDF)'}
            </button>
            <Link to="/my-tickets" className="flex-1 bg-primary text-on-primary py-5 rounded-2xl font-bold text-center hover:bg-primary-container transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/10">Go to Dashboard <ArrowRight className="w-5 h-5" /></Link>
          </div>
        </div>
      </motion.div>

      {bus && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Live Trip Tracking</h2>
              <p className="text-on-surface-variant font-medium">Track your bus location in real-time.</p>
            </div>
            <div className="bg-primary-fixed px-4 py-2 rounded-2xl text-primary font-black text-xs uppercase tracking-widest">
              {bus.operator}
            </div>
          </div>
          <LiveMap bus={bus} />
        </motion.div>
      )}
    </div>
  );
};
