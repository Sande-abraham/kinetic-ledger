import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Ticket, 
  Calendar, 
  Clock, 
  Bus as BusIcon, 
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  MessageSquare,
  Bell,
  Check,
  Edit,
  RefreshCcw
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, arrayRemove, getDoc, increment, arrayUnion, serverTimestamp, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';
import { format } from 'date-fns';
import { Booking, Complaint, StaffNotification } from '../types';
import { cn } from '../lib/utils';
import { addDoc } from 'firebase/firestore';

export const MyTicketsPage = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [notifications, setNotifications] = React.useState<StaffNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingBooking, setEditingBooking] = React.useState<Booking | null>(null);
  const [newSeats, setNewSeats] = React.useState<string[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const { profile } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bookings'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookings'));

    const qComplaints = query(collection(db, 'complaints'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubComplaints = onSnapshot(qComplaints, (snapshot) => {
      setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'complaints'));

    // Staff notifications - check by UID or by phone number
    const qNotifications = query(
      collection(db, 'staff_notifications'), 
      orderBy('createdAt', 'desc')
    );
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffNotification));
      // Filter client-side to handle both UID and Phone matching
      const filtered = allNotifs.filter(n => 
        n.staffId === user.uid || 
        (profile?.phoneNumber && n.staffContact === profile.phoneNumber)
      );
      setNotifications(filtered);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'staff_notifications'));

    return () => { unsubBookings(); unsubComplaints(); unsubNotifications(); };
  }, [user]);

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'staff_notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `staff_notifications/${id}`);
    }
  };

  const handleCancel = async (booking: Booking) => {
    if (!user) return;
    
    const confirm = window.confirm(`Are you sure you want to cancel this booking? A 100% refund will be credited to your Kinetic Wallet.`);
    if (!confirm) return;

    setCancellingId(booking.id);
    try {
      // 1. Update booking status
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'cancelled',
        refundAmount: booking.totalPrice,
        cancelledAt: new Date()
      });

      // 2. Release seats on the bus
      const busRef = doc(db, 'buses', booking.busId);
      await updateDoc(busRef, {
        bookedSeats: arrayRemove(...booking.seatNumbers)
      });

      // 3. Refund to wallet
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(booking.totalPrice)
      });

      // 4. Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: booking.totalPrice,
        type: 'refund',
        description: `Refund for booking ${booking.id.substring(0, 8)}`,
        createdAt: serverTimestamp()
      });

      notify('Booking cancelled. Full refund credited to your wallet!', 'success');
    } catch (err) {
      notify('Failed to cancel booking.', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setCancellingId(null);
    }
  };

  const handleEditTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !user || newSeats.length === 0) return;
    
    setProcessing(true);
    try {
      const busRef = doc(db, 'buses', editingBooking.busId);
      const busSnap = await getDoc(busRef);
      if (!busSnap.exists()) throw new Error('Bus not found');
      
      const busData = busSnap.data();
      const alreadyBooked = busData.bookedSeats.filter((s: string) => !editingBooking.seatNumbers.includes(s));
      const conflict = newSeats.some(s => alreadyBooked.includes(s));
      
      if (conflict) {
        notify('Some selected seats are already booked.', 'error');
        return;
      }

      // 1. Update bus seats
      await updateDoc(busRef, {
        bookedSeats: arrayRemove(...editingBooking.seatNumbers)
      });
      await updateDoc(busRef, {
        bookedSeats: arrayUnion(...newSeats)
      });

      // 2. Update booking
      await updateDoc(doc(db, 'bookings', editingBooking.id), {
        seatNumbers: newSeats,
        updatedAt: new Date()
      });

      notify('Ticket updated successfully!', 'success');
      setShowEditModal(false);
    } catch (err) {
      notify('Failed to update ticket.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="pt-40 text-center font-bold">Loading your journeys...</div>;

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-6 md:gap-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">My Journeys</h1>
          <p className="text-on-surface-variant text-sm md:text-lg">Manage your upcoming and past trips with The Kinetic Ledger.</p>
        </div>
        <Link to="/" className="w-full md:w-auto bg-primary-fixed text-primary px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all">
          Book New Trip <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-32 bg-surface-container-low rounded-[40px] border border-outline-variant/10">
          <Ticket className="w-20 h-20 text-outline mx-auto mb-6 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">No tickets found</h2>
          <p className="text-on-surface-variant">Your travel history will appear here once you book a seat.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div 
              key={booking.id} 
              className={cn(
                "group block bg-surface-container-lowest p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-outline-variant/10 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden",
                booking.status === 'cancelled' && "opacity-60 grayscale"
              )}
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 relative z-10">
                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                  <div className="bg-surface-container-low p-4 md:p-5 rounded-2xl md:rounded-3xl group-hover:bg-primary-fixed transition-colors">
                    <BusIcon className="text-primary w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 md:gap-3 mb-1">
                      <h3 className="text-xl md:text-2xl font-bold">{booking.busOperator}</h3>
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                        booking.status === 'cancelled' ? "bg-error-container text-error" : "bg-secondary-container text-secondary"
                      )}>
                        {booking.status === 'cancelled' ? 'CANCELLED' : booking.paymentStatus}
                      </span>
                    </div>
                    <p className="text-xs md:text-on-surface-variant font-medium">Kampala → Lira</p>
                  </div>
                </div>

                <div className="flex justify-between md:justify-center gap-4 md:gap-12 w-full md:w-auto border-y md:border-none py-4 md:py-0 border-outline-variant/10">
                  <div className="text-left md:text-center">
                    <p className="text-[8px] md:text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Departure</p>
                    <div className="flex items-center gap-2 font-bold text-sm md:text-base">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{format(booking.departureTime.toDate(), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="text-right md:text-center">
                    <p className="text-[8px] md:text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Seats</p>
                    <div className="flex items-center gap-2 font-bold text-sm md:text-base">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>{booking.seatNumbers.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold text-outline uppercase">Total Paid</p>
                    <p className="text-lg md:text-xl font-black text-primary">{booking.totalPrice.toLocaleString()} UGX</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.status !== 'cancelled' && (
                      <>
                        <button 
                          onClick={() => { setEditingBooking(booking); setNewSeats(booking.seatNumbers); setShowEditModal(true); }}
                          className="p-2.5 md:p-3 bg-surface-container-low text-on-surface-variant rounded-xl hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold"
                        >
                          <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" /> Edit
                        </button>
                        <button 
                          onClick={() => handleCancel(booking)}
                          disabled={cancellingId === booking.id}
                          className="p-2.5 md:p-3 bg-error-container text-error rounded-xl hover:bg-error hover:text-on-error transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> {cancellingId === booking.id ? '...' : 'Cancel'}
                        </button>
                      </>
                    )}
                    <Link 
                      to={`/confirmation/${booking.id}`}
                      className="p-2.5 md:p-3 bg-surface-container-low text-on-surface-variant rounded-xl hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold"
                    >
                      <Ticket className="w-3.5 h-3.5 md:w-4 md:h-4" /> Ticket
                    </Link>
                  </div>
                </div>
              </div>
              
              {booking.status === 'cancelled' && (
                <div className="mt-6 pt-6 border-t border-outline-variant/10 flex items-center gap-3 text-secondary">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-xs font-bold">Refund of {booking.totalPrice.toLocaleString()} UGX credited to your Kinetic Wallet.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {notifications.length > 0 && (
        <div className="mt-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-primary-fixed p-3 rounded-2xl text-primary">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black tracking-tight">Staff Notifications</h2>
          </div>

          <div className="space-y-4">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={cn(
                  "p-6 rounded-3xl border transition-all flex items-center justify-between gap-6",
                  notif.read ? "bg-surface-container-low border-outline-variant/10 opacity-60" : "bg-primary-fixed/20 border-primary/20 shadow-sm"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full", notif.read ? "bg-outline" : "bg-primary animate-pulse")} />
                  <div>
                    <p className="font-bold text-on-surface">{notif.message}</p>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">
                      {notif.createdAt ? format(notif.createdAt.toDate(), 'MMM dd, yyyy • HH:mm') : 'Just now'}
                    </p>
                  </div>
                </div>
                {!notif.read && (
                  <button 
                    onClick={() => markNotificationRead(notif.id)}
                    className="p-2 bg-primary text-on-primary rounded-xl hover:bg-primary-container hover:text-primary transition-all"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {complaints.length > 0 && (
        <div className="mt-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-secondary-container p-3 rounded-2xl text-secondary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black tracking-tight">Support Requests</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{complaint.subject}</h3>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
                      {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM dd, yyyy • HH:mm') : 'Just now'}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black px-3 py-1 rounded-full uppercase",
                    complaint.status === 'resolved' ? "bg-primary-container text-primary" : "bg-surface-container-highest text-outline"
                  )}>
                    {complaint.status.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed bg-surface-container-lowest p-4 rounded-2xl italic">
                  "{complaint.message}"
                </p>

                {complaint.adminResponse && (
                  <div className="bg-primary-fixed/30 p-6 rounded-3xl border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Admin Response</p>
                    <p className="text-sm font-medium text-on-surface leading-relaxed">
                      {complaint.adminResponse}
                    </p>
                    {complaint.resolvedAt && (
                      <p className="text-[10px] text-primary/60 mt-2 font-bold">
                        Resolved on {format(complaint.resolvedAt.toDate(), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      <AnimatePresence>
        {showEditModal && editingBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface p-10 rounded-[48px] shadow-2xl max-w-2xl w-full border border-outline-variant/10"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Edit Your Ticket</h2>
                  <p className="text-sm text-outline font-bold uppercase tracking-widest">{editingBooking.busOperator} • Kampala → Lira</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 bg-surface-container-low rounded-xl hover:bg-error-container hover:text-error transition-all">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditTicket} className="space-y-8">
                <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/10">
                  <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-6">Select New Seats</h3>
                  <div className="grid grid-cols-6 gap-3">
                    {/* Simplified seat selector for editing */}
                    {[...Array(30)].map((_, i) => {
                      const seat = `${i < 15 ? 'A' : 'B'}${i % 15 + 1}`;
                      const isSelected = newSeats.includes(seat);
                      const isOriginal = editingBooking.seatNumbers.includes(seat);
                      
                      return (
                        <button
                          key={seat}
                          type="button"
                          onClick={() => {
                            if (newSeats.includes(seat)) {
                              setNewSeats(newSeats.filter(s => s !== seat));
                            } else if (newSeats.length < editingBooking.seatNumbers.length) {
                              setNewSeats([...newSeats, seat]);
                            } else {
                              notify(`You can only select ${editingBooking.seatNumbers.length} seats.`, 'warning');
                            }
                          }}
                          className={cn(
                            "w-10 h-10 rounded-lg text-[10px] font-black transition-all",
                            isSelected ? "bg-primary text-on-primary" : 
                            isOriginal ? "bg-secondary-container text-secondary" :
                            "bg-surface-container-highest text-outline hover:bg-primary/20"
                          )}
                        >
                          {seat}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-6 text-[10px] font-bold text-outline italic">
                    * You must select exactly {editingBooking.seatNumbers.length} seats.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={processing || newSeats.length !== editingBooking.seatNumbers.length}
                  className="w-full bg-primary text-on-primary py-5 rounded-2xl font-bold text-lg hover:bg-primary-container transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {processing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {processing ? 'Updating...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
