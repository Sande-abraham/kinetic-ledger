import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Download, ArrowRight, Calendar, Clock, MapPin, Bus as BusIcon, CreditCard, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Booking, Bus } from '../types';
import { useNotification } from '../lib/NotificationContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { LiveMap } from '../components/LiveMap';
import { Printer } from 'lucide-react';

export const ConfirmationPage = () => {
  const { bookingId } = useParams();
  const { notify } = useNotification();
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
      
      // Create a clean clone for PDF generation
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => el.classList.contains('no-print'),
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('ticket-to-download') as HTMLElement;
          if (el) {
            el.style.boxShadow = 'none';
            el.style.borderRadius = '0';
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
      notify('Ticket downloaded successfully!', 'success');
    } catch (error) {
      console.error('PDF generation failed:', error);
      notify('Failed to generate PDF. Please try printing instead.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!booking) return <div className="pt-40 text-center font-bold">Loading your ticket...</div>;

  return (
    <div className="pt-24 md:pt-32 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      <motion.div 
        id="ticket-to-download"
        ref={ticketRef}
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-surface-container-lowest rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl border border-outline-variant/10"
      >
        <div className="bg-primary p-6 md:p-12 text-on-primary text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10"><BusIcon className="w-24 h-24 md:w-48 md:h-48 rotate-12" /></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 backdrop-blur-md"><CheckCircle2 className="w-6 h-6 md:w-12 md:h-12" /></div>
            <h1 className="text-xl md:text-4xl font-black mb-1 md:mb-3">Booking Confirmed!</h1>
            <p className="text-primary-fixed/80 text-xs md:text-lg">Your seat is secured. Get ready for an executive journey.</p>
          </div>
        </div>
        <div className="p-6 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8 md:mb-12">
            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div><p className="text-[10px] md:text-xs font-bold text-outline uppercase mb-1">Ticket ID</p><p className="text-sm md:text-base font-bold font-mono text-primary">{booking.id.substring(0, 12).toUpperCase()}</p></div>
                <div className="text-right"><p className="text-[10px] md:text-xs font-bold text-outline uppercase mb-1">Status</p><span className="bg-secondary-container text-secondary text-[8px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase">{booking.paymentStatus}</span></div>
              </div>
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-surface-container-low rounded-xl md:rounded-2xl"><BusIcon className="text-primary w-5 h-5 md:w-6 md:h-6" /><div><p className="text-[10px] text-outline font-bold uppercase">Operator</p><p className="text-sm md:text-base font-bold">{booking.busOperator}</p></div></div>
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-surface-container-low rounded-xl md:rounded-2xl"><MapPin className="text-primary w-5 h-5 md:w-6 md:h-6" /><div><p className="text-[10px] text-outline font-bold uppercase">Route</p><p className="text-sm md:text-base font-bold">Kampala → Lira</p></div></div>
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-surface-container-low rounded-xl md:rounded-2xl"><Clock className="text-primary w-5 h-5 md:w-6 md:h-6" /><div><p className="text-[10px] text-outline font-bold uppercase">Departure</p><p className="text-sm md:text-base font-bold">{format(booking.departureTime.toDate(), 'MMM dd, yyyy • HH:mm')}</p></div></div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-surface-container-low rounded-[32px] md:rounded-[40px] border-2 border-dashed border-outline-variant/30">
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg mb-4 md:mb-6"><QRCodeSVG value={booking.id} size={140} /></div>
              <p className="text-[10px] font-bold text-outline uppercase mb-3 md:mb-4">Boarding Pass</p>
              <div className="flex flex-wrap gap-2 justify-center">{booking.seatNumbers.map(s => <span key={s} className="bg-primary text-on-primary font-black px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-base md:text-lg shadow-lg shadow-primary/20">{s}</span>)}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-outline-variant/10">
            <div className="flex items-center gap-3"><CreditCard className="text-primary w-5 h-5" /><div><p className="text-[10px] font-bold text-outline uppercase">Payment</p><p className="text-sm font-bold">{booking.paymentMethod} • {booking.totalPrice.toLocaleString()} UGX</p></div></div>
            <div className="flex items-center gap-3"><Calendar className="text-primary w-5 h-5" /><div><p className="text-[10px] font-bold text-outline uppercase">Booked On</p><p className="text-sm font-bold">{format(booking.createdAt.toDate(), 'MMM dd, yyyy')}</p></div></div>
            <div className="flex items-center gap-3"><CheckCircle2 className="text-primary w-5 h-5" /><div><p className="text-[10px] font-bold text-outline uppercase">Transaction ID</p><p className="text-sm font-bold font-mono">{booking.transactionId}</p></div></div>
          </div>
          <div className="mt-8 md:mt-12 flex flex-col md:flex-row gap-3 md:gap-4 no-print">
            <button 
              onClick={handleDownloadPDF} 
              disabled={downloading}
              className="flex-1 bg-surface-container-highest text-on-surface py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:bg-outline-variant/20 transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
            >
              {downloading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Download className="w-4 h-4 md:w-5 md:h-5" />}
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 bg-surface-container-highest text-on-surface py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:bg-outline-variant/20 transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
            >
              <Printer className="w-4 h-4 md:w-5 md:h-5" /> Print Ticket
            </button>
            <Link to="/my-tickets" className="flex-1 bg-primary text-on-primary py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-center hover:bg-primary-container transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-primary/10 text-sm md:text-base">Dashboard <ArrowRight className="w-4 h-4 md:w-5 md:h-5" /></Link>
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
