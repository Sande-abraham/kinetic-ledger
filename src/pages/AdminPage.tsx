import React from 'react';
import { 
  Bus as BusIcon, 
  Users, 
  TrendingUp, 
  Calendar, 
  Search, 
  Plus, 
  Trash2, 
  UserCheck, 
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Navigation,
  Bell
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Bus, Booking, Driver, Conductor } from '../types';
import { useNotification } from '../lib/NotificationContext';

export const AdminPage = () => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = React.useState<'overview' | 'bookings' | 'buses' | 'staff' | 'users' | 'complaints' | 'maintenance'>('overview');
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [conductors, setConductors] = React.useState<Conductor[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [complaints, setComplaints] = React.useState<any[]>([]);
  const [trackingBus, setTrackingBus] = React.useState<Bus | null>(null);
  const [respondingTo, setRespondingTo] = React.useState<any | null>(null);
  const [responseMessage, setResponseMessage] = React.useState('');
  const [editingMaintenance, setEditingMaintenance] = React.useState<Bus | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [maintenanceForm, setMaintenanceForm] = React.useState({
    fuelLevel: 0,
    lastServiceDate: '',
    nextServiceDate: '',
    mileage: 0,
    healthStatus: 'excellent' as any,
    fuelIssued: 0
  });
  
  // Form states
  const [newBus, setNewBus] = React.useState({ operator: '', route: 'Kampala-Lira', price: '', departureTime: '', driverId: '', conductorId: '', imageUrl: '' });
  const [newStaff, setNewStaff] = React.useState({ name: '', contact: '', type: 'driver' as 'driver' | 'conductor' });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [userSearch, setUserSearch] = React.useState('');
  const [emailToPromote, setEmailToPromote] = React.useState('');

  React.useEffect(() => {
    const unsubBookings = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
    });
    const unsubBuses = onSnapshot(collection(db, 'buses'), (snap) => {
      setBuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bus)));
    });
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver)));
    });
    const unsubConductors = onSnapshot(collection(db, 'conductors'), (snap) => {
      setConductors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conductor)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubComplaints = onSnapshot(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')), (snap) => {
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubBookings(); unsubBuses(); unsubDrivers(); unsubConductors(); unsubUsers(); unsubComplaints(); };
  }, []);

  // Update tracking bus if it changes in the background
  React.useEffect(() => {
    if (trackingBus) {
      const updated = buses.find(b => b.id === trackingBus.id);
      if (updated) setTrackingBus(updated);
    }
  }, [buses, trackingBus]);

  const stats = {
    totalBookings: bookings.length,
    totalRevenue: bookings.filter(b => b.paymentStatus === 'PAID' && b.status !== 'cancelled').reduce((acc, b) => acc + b.totalPrice, 0),
    cancelledCount: bookings.filter(b => b.status === 'cancelled').length,
    refundTotal: bookings.filter(b => b.status === 'cancelled').reduce((acc, b) => acc + (b.refundAmount || 0), 0),
    avgOccupancy: buses.length ? (buses.reduce((acc, b) => acc + (b.bookedSeats.length / b.totalSeats), 0) / buses.length * 100).toFixed(1) : 0,
    activeBuses: buses.length,
    availableDrivers: drivers.length,
    availableConductors: conductors.length
  };

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const seatNumbers = [];
      for (let i = 1; i <= 15; i++) seatNumbers.push(`A${i}`);
      for (let i = 1; i <= 15; i++) seatNumbers.push(`B${i}`);
      
      await addDoc(collection(db, 'buses'), {
        operator: newBus.operator,
        route: newBus.route,
        imageUrl: newBus.imageUrl,
        departureTime: Timestamp.fromDate(new Date(newBus.departureTime)),
        price: parseInt(newBus.price),
        totalSeats: 30,
        seatNumbers,
        bookedSeats: [],
        driverId: newBus.driverId,
        conductorId: newBus.conductorId,
        status: 'idle',
        progress: 0
      });
      setNewBus({ operator: '', route: 'Kampala-Lira', price: '', departureTime: '', driverId: '', conductorId: '', imageUrl: '' });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'buses'); }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, newStaff.type === 'driver' ? 'drivers' : 'conductors'), {
        name: newStaff.name,
        contact: newStaff.contact
      });
      setNewStaff({ name: '', contact: '', type: 'driver' });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'staff'); }
  };

  const sendStaffNotification = async (staffId: string, message: string, staffContact?: string) => {
    try {
      await addDoc(collection(db, 'staff_notifications'), {
        staffId,
        staffContact: staffContact || null,
        message,
        type: 'assignment',
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus || b.paymentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const simulateTracking = async (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    if (!bus) return;

    try {
      const newStatus = bus.status === 'idle' ? 'on-trip' : bus.status === 'on-trip' ? 'arrived' : 'idle';
      const newProgress = newStatus === 'on-trip' ? 45 : newStatus === 'arrived' ? 100 : 0;
      
      // Calculate dynamic fuel and mileage
      // 100% progress = 340KM distance
      // Consumption: ~1L per 5KM (Standard for a bus)
      const tripDistance = 340; 
      const currentDistance = (newProgress / 100) * tripDistance;
      const fuelConsumed = currentDistance / 5; // Liters used
      
      const fuelIssued = bus.tripData?.fuelIssued || 80; // Default to 80L if not set
      const fuelVariance = fuelIssued - fuelConsumed;
      
      // Only add mileage when the bus actually completes a trip (arrives)
      const additionalMileage = newStatus === 'arrived' ? tripDistance : 0;
      
      const updatedMaintenance = {
        ...(bus.maintenance || {
          lastServiceDate: serverTimestamp(),
          nextServiceDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          healthStatus: 'excellent',
          mileage: 12500 // Base mileage if none exists
        }),
        fuelLevel: Math.max(0, 100 - (newProgress * 0.3)), // Visual percentage
        mileage: (bus.maintenance?.mileage || 12500) + additionalMileage
      };

      await updateDoc(doc(db, 'buses', busId), {
        status: newStatus,
        progress: newProgress,
        lastLocationUpdate: serverTimestamp(),
        maintenance: updatedMaintenance,
        tripData: {
          fuelIssued,
          fuelConsumed,
          fuelVariance,
          distanceCovered: currentDistance
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `buses/${busId}`);
    }
  };

  const handleUpdateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaintenance) return;
    try {
      await updateDoc(doc(db, 'buses', editingMaintenance.id), {
        maintenance: {
          fuelLevel: Number(maintenanceForm.fuelLevel),
          lastServiceDate: Timestamp.fromDate(new Date(maintenanceForm.lastServiceDate)),
          nextServiceDate: Timestamp.fromDate(new Date(maintenanceForm.nextServiceDate)),
          mileage: Number(maintenanceForm.mileage),
          healthStatus: maintenanceForm.healthStatus
        },
        tripData: {
          ...(editingMaintenance.tripData || { fuelConsumed: 0, fuelVariance: 0, distanceCovered: 0 }),
          fuelIssued: Number(maintenanceForm.fuelIssued)
        }
      });
      setEditingMaintenance(null);
      notify('Maintenance records updated successfully!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `buses/${editingMaintenance.id}`);
    }
  };

  return (
    <div className="pt-20 md:pt-32 pb-24 px-3 md:px-6 max-w-7xl mx-auto">
      {/* Custom Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-outline-variant/10">
            <h3 className="text-xl font-bold mb-2">{confirmAction.title}</h3>
            <p className="text-on-surface-variant text-sm mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-sm bg-primary text-on-primary hover:bg-primary-container transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Edit Modal */}
      {editingMaintenance && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" onClick={() => setEditingMaintenance(null)} />
          <div className="relative bg-surface p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl max-w-xl w-full border border-outline-variant/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 md:mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-1">Edit Maintenance</h2>
                <p className="text-on-surface-variant font-medium text-sm md:text-base">{editingMaintenance.operator} Fleet Records</p>
              </div>
              <button onClick={() => setEditingMaintenance(null)} className="p-2 hover:bg-surface-container rounded-full transition-all">
                <XCircle className="w-8 h-8 text-outline" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaintenance} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Fuel Issued (Liters)</label>
                  <input 
                    type="number" min="0" required
                    value={maintenanceForm.fuelIssued || 0}
                    onChange={e => setMaintenanceForm({...maintenanceForm, fuelIssued: parseInt(e.target.value) || 0})}
                    className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                    placeholder="e.g. 80"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Fuel Level (%)</label>
                  <input 
                    type="number" min="0" max="100" required
                    value={maintenanceForm.fuelLevel || 0}
                    onChange={e => setMaintenanceForm({...maintenanceForm, fuelLevel: parseInt(e.target.value) || 0})}
                    className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Health Status</label>
                  <select 
                    value={maintenanceForm.healthStatus}
                    onChange={e => setMaintenanceForm({...maintenanceForm, healthStatus: e.target.value as any})}
                    className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Current Mileage (KM)</label>
                  <input 
                    type="number" required
                    value={maintenanceForm.mileage || 0}
                    onChange={e => setMaintenanceForm({...maintenanceForm, mileage: parseInt(e.target.value) || 0})}
                    className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Last Service Date</label>
                  <input 
                    type="date" required
                    value={maintenanceForm.lastServiceDate}
                    onChange={e => setMaintenanceForm({...maintenanceForm, lastServiceDate: e.target.value})}
                    className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Next Service Date</label>
                  <input 
                    type="date" required
                    value={maintenanceForm.nextServiceDate}
                    onChange={e => setMaintenanceForm({...maintenanceForm, nextServiceDate: e.target.value})}
                    className="w-full bg-surface-container-low p-4 rounded-2xl border-none focus:ring-2 ring-primary/20"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold hover:bg-primary-container transition-all">
                Update Records
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingBus && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" onClick={() => setTrackingBus(null)} />
          <div className="relative bg-surface p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl max-w-2xl w-full border border-outline-variant/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 md:mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-1">Live Tracking</h2>
                <p className="text-on-surface-variant font-medium text-sm md:text-base">{trackingBus.operator} • Kampala → Lira</p>
              </div>
              <button onClick={() => setTrackingBus(null)} className="p-2 hover:bg-surface-container rounded-full transition-all">
                <XCircle className="w-8 h-8 text-outline" />
              </button>
            </div>

            <div className="bg-surface-container-low p-8 rounded-[32px] mb-8 border border-outline-variant/10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary">
                    <Navigation className={cn("w-6 h-6", trackingBus.status === 'on-trip' && "animate-pulse")} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-outline uppercase tracking-widest">Status</p>
                    <p className="font-black text-xl capitalize">{trackingBus.status || 'Idle'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-outline uppercase tracking-widest">Progress</p>
                  <p className="font-black text-xl text-primary">{trackingBus.progress || 0}%</p>
                </div>
              </div>

              <div className="relative h-4 bg-surface-container-highest rounded-full mb-8 overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-in-out"
                  style={{ width: `${trackingBus.progress || 0}%` }}
                />
                {/* Bus Icon on progress bar */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out"
                  style={{ left: `calc(${trackingBus.progress || 0}% - 12px)` }}
                >
                  <BusIcon className="w-6 h-6 text-on-primary drop-shadow-md" />
                </div>
              </div>

              <div className="flex justify-between text-xs font-bold text-outline uppercase">
                <div className="flex flex-col items-start gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Kampala</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span>Lira</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 text-center">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Fuel Issued</p>
                <p className="font-black text-lg text-primary">{trackingBus.tripData?.fuelIssued || 0}L</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 text-center">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Consumed</p>
                <p className="font-black text-lg text-secondary">{Math.round(trackingBus.tripData?.fuelConsumed || 0)}L</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 text-center">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Variance</p>
                <p className={cn(
                  "font-black text-lg",
                  (trackingBus.tripData?.fuelVariance || 0) < 0 ? "text-error" : "text-primary"
                )}>
                  {Math.round(trackingBus.tripData?.fuelVariance || 0)}L
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Fuel Level</p>
                  <span className={cn("text-xs font-black", (trackingBus.maintenance?.fuelLevel || 0) < 20 ? "text-error" : "text-primary")}>
                    {Math.round(trackingBus.maintenance?.fuelLevel ?? 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000", (trackingBus.maintenance?.fuelLevel || 0) < 20 ? "bg-error" : "bg-primary")}
                    style={{ width: `${trackingBus.maintenance?.fuelLevel || 100}%` }}
                  />
                </div>
              </div>
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Current Mileage</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="font-black text-lg">{Math.round(trackingBus.maintenance?.mileage ?? 0).toLocaleString()} KM</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <p className="text-[10px] font-bold text-outline uppercase mb-2">Assigned Driver</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold">
                    {drivers.find(d => d.id === trackingBus.driverId)?.name[0] || '?'}
                  </div>
                  <p className="font-bold">{drivers.find(d => d.id === trackingBus.driverId)?.name || 'Not Assigned'}</p>
                </div>
              </div>
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <p className="text-[10px] font-bold text-outline uppercase mb-2">Driver Contact</p>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary" />
                  <p className="font-bold">{drivers.find(d => d.id === trackingBus.driverId)?.contact || 'N/A'}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => simulateTracking(trackingBus.id)}
              className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-3"
            >
              <Navigation className="w-5 h-5" />
              Simulate Movement Update
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-12 gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-1 md:mb-2">Admin Command Center</h1>
          <p className="text-on-surface-variant text-xs md:text-base">Precision management for The Kinetic Ledger fleet.</p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-xl md:rounded-2xl overflow-x-auto max-w-full no-scrollbar">
          {['overview', 'bookings', 'buses', 'staff', 'users', 'complaints', 'maintenance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-3 md:px-6 py-1.5 md:py-2.5 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm transition-all capitalize whitespace-nowrap",
                activeTab === tab ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 md:space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary-fixed p-3 md:p-4 rounded-2xl text-primary"><TrendingUp className="w-5 h-5 md:w-6 md:h-6" /></div>
                <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-primary bg-primary-fixed/20 px-2 py-1 rounded-full"><ArrowUpRight className="w-3 h-3" /> 12%</span>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest mb-1">Total Revenue</p>
              <p className="text-2xl md:text-3xl font-black">{stats.totalRevenue.toLocaleString()} <span className="text-xs md:text-sm font-bold text-outline">UGX</span></p>
            </div>

            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-secondary-container p-3 md:p-4 rounded-2xl text-secondary"><Calendar className="w-5 h-5 md:w-6 md:h-6" /></div>
                <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-secondary bg-secondary-container/20 px-2 py-1 rounded-full"><ArrowUpRight className="w-3 h-3" /> 8%</span>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest mb-1">Total Bookings</p>
              <p className="text-2xl md:text-3xl font-black">{stats.totalBookings}</p>
            </div>

            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-error-container p-3 md:p-4 rounded-2xl text-error"><XCircle className="w-5 h-5 md:w-6 md:h-6" /></div>
                <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-error bg-error-container/20 px-2 py-1 rounded-full"><ArrowDownRight className="w-3 h-3" /> 2%</span>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest mb-1">Cancellations</p>
              <p className="text-2xl md:text-3xl font-black">{stats.cancelledCount}</p>
            </div>

            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-tertiary-fixed p-3 md:p-4 rounded-2xl text-tertiary"><BusIcon className="w-5 h-5 md:w-6 md:h-6" /></div>
                <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-tertiary bg-tertiary-fixed/20 px-2 py-1 rounded-full">{stats.avgOccupancy}%</span>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest mb-1">Avg Occupancy</p>
              <p className="text-2xl md:text-3xl font-black">{stats.activeBuses} <span className="text-xs md:text-sm font-bold text-outline">Buses</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold">Recent Activity</h2>
                <button onClick={() => setActiveTab('bookings')} className="text-primary text-sm font-bold hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {bookings.slice(0, 6).map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 md:p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-base",
                        b.status === 'cancelled' ? "bg-error-container text-error" : "bg-primary-fixed text-primary"
                      )}>
                        {b.customerName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm md:text-base">{b.customerName}</p>
                        <p className="text-[10px] md:text-xs text-on-surface-variant">{b.busOperator} • {b.seatNumbers.join(', ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm md:text-base">{b.totalPrice.toLocaleString()} UGX</p>
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                        b.status === 'cancelled' ? 'bg-error-container text-error' : 'bg-secondary-container text-secondary'
                      )}>
                        {b.status === 'cancelled' ? 'CANCELLED' : b.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8">Fleet Status</h2>
              <div className="space-y-6 md:space-y-8">
                {buses.map((bus) => {
                  const percent = (bus.bookedSeats.length / bus.totalSeats) * 100;
                  return (
                    <div key={bus.id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="font-bold text-base md:text-lg">{bus.operator}</p>
                          <p className="text-[10px] md:text-xs text-outline flex items-center gap-1"><Clock className="w-3 h-3" /> {format(bus.departureTime.toDate(), 'hh:mm a')} • Kampala → Lira</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs md:text-sm font-black text-primary">{percent.toFixed(0)}% Full</p>
                          <p className="text-[8px] md:text-[10px] font-bold text-outline">{bus.bookedSeats.length} / {bus.totalSeats} Seats</p>
                        </div>
                      </div>
                      <div className="h-3 md:h-4 bg-surface-container-low rounded-full overflow-hidden p-0.5 md:p-1">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", percent > 80 ? 'bg-error' : percent > 50 ? 'bg-tertiary' : 'bg-primary')} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-surface-container-lowest rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm overflow-hidden">
          <div className="p-4 md:p-8 border-b border-outline-variant/10 flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by name or ticket ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-low pl-12 pr-4 py-3 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
              />
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <Filter className="text-outline w-5 h-5 shrink-0" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 lg:flex-none bg-surface-container-low px-4 py-3 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold text-sm"
              >
                <option value="all">All Payments</option>
                <option value="PAID">Paid</option>
                <option value="NOT PAID">Not Paid</option>
              </select>
            </div>
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest">
                  <th className="px-4 md:px-8 py-4">Customer</th>
                  <th className="px-4 md:px-8 py-4">Bus / Route</th>
                  <th className="px-4 md:px-8 py-4">Seats</th>
                  <th className="px-4 md:px-8 py-4">Payment</th>
                  <th className="px-4 md:px-8 py-4">Time</th>
                  <th className="px-4 md:px-8 py-4">Ticket ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <p className="font-bold text-sm md:text-base">{b.customerName}</p>
                      <p className="text-[10px] md:text-xs text-on-surface-variant">{b.customerPhone}</p>
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <p className="font-bold text-sm md:text-base">{b.busOperator}</p>
                      <p className="text-[10px] md:text-xs text-on-surface-variant">Kampala → Lira</p>
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <div className="flex flex-wrap gap-1">
                        {b.seatNumbers.map(s => (
                          <span key={s} className="bg-primary-fixed text-primary text-[8px] md:text-[10px] font-bold px-2 py-0.5 rounded-md">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <span className={cn("text-[8px] md:text-[10px] font-black uppercase px-2 md:px-3 py-1 rounded-full", 
                        b.paymentStatus === 'PAID' ? 'bg-secondary-container text-secondary' : 'bg-error-container text-error'
                      )}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <p className="text-xs md:text-sm">{format(b.createdAt.toDate(), 'MMM dd, HH:mm')}</p>
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6 font-mono text-[10px] md:text-xs text-outline">
                      {b.id.substring(0, 8).toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-outline-variant/10">
            {filteredBookings.map((b) => (
              <div key={b.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{b.customerName}</p>
                    <p className="text-[10px] text-on-surface-variant">{b.customerPhone}</p>
                  </div>
                  <span className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-full", 
                    b.paymentStatus === 'PAID' ? 'bg-secondary-container text-secondary' : 'bg-error-container text-error'
                  )}>
                    {b.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <div>
                    <p className="font-bold">{b.busOperator}</p>
                    <p className="text-on-surface-variant">Kampala → Lira</p>
                  </div>
                  <div className="text-right">
                    <p className="text-outline">{format(b.createdAt.toDate(), 'MMM dd, HH:mm')}</p>
                    <p className="font-mono text-outline uppercase">{b.id.substring(0, 8)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {b.seatNumbers.map(s => (
                    <span key={s} className="bg-primary-fixed text-primary text-[8px] font-bold px-2 py-0.5 rounded-md">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'buses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-1 bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm h-fit">
            <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center gap-3">
              <Plus className="text-primary" /> Add New Bus
            </h2>
            <form onSubmit={handleAddBus} className="space-y-4 md:space-y-6">
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Operator Name</label>
                <input 
                  type="text" required
                  value={newBus.operator}
                  onChange={e => setNewBus({...newBus, operator: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                  placeholder="e.g. Ledger Express"
                />
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Route</label>
                <select 
                  value={newBus.route}
                  onChange={e => setNewBus({...newBus, route: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                >
                  <option value="Kampala-Lira">Kampala → Lira</option>
                  <option value="Lira-Kampala">Lira → Kampala</option>
                  <option value="Kampala-Mbarara">Kampala → Mbarara</option>
                  <option value="Mbarara-Kampala">Mbarara → Kampala</option>
                  <option value="Kampala-Gulu">Kampala → Gulu</option>
                  <option value="Gulu-Kampala">Gulu → Kampala</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Price (UGX)</label>
                <input 
                  type="number" required
                  value={newBus.price}
                  onChange={e => setNewBus({...newBus, price: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                  placeholder="35000"
                />
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Departure Time</label>
                <input 
                  type="datetime-local" required
                  value={newBus.departureTime}
                  onChange={e => setNewBus({...newBus, departureTime: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Assign Driver</label>
                <select 
                  value={newBus.driverId}
                  onChange={e => setNewBus({...newBus, driverId: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                >
                  <option value="">Select Driver</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Bus Image URL (Optional)</label>
                <input 
                  type="url"
                  value={newBus.imageUrl}
                  onChange={e => setNewBus({...newBus, imageUrl: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary py-3 md:py-4 rounded-2xl font-bold hover:bg-primary-container transition-all text-sm">
                Create Schedule
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {buses.map(bus => (
              <div key={bus.id} className="bg-surface-container-lowest p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-outline-variant/10 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 md:gap-8">
                <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                  <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0">
                    <img 
                      src={bus.imageUrl || `https://picsum.photos/seed/${bus.operator.replace(/\s+/g, '-').toLowerCase()}/200/200`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt={bus.operator}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg md:text-2xl font-bold truncate">{bus.operator}</h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs text-on-surface-variant mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(bus.departureTime.toDate(), 'MMM dd, HH:mm')}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {bus.bookedSeats.length}/{bus.totalSeats} Booked</span>
                      {bus.driverId && (
                        <span className="flex items-center gap-1 text-primary font-bold">
                          <UserCheck className="w-4 h-4" /> {drivers.find(d => d.id === bus.driverId)?.name || 'Unknown Driver'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => setTrackingBus(bus)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary-fixed text-primary rounded-xl font-bold text-[10px] md:text-xs hover:bg-primary hover:text-on-primary transition-all"
                  >
                    <Navigation className="w-3 h-3 md:w-4 md:h-4" /> Track
                  </button>
                  <button 
                    onClick={() => {
                      setConfirmAction({
                        title: 'Delete Bus',
                        message: `Are you sure you want to delete ${bus.operator}? This action cannot be undone.`,
                        onConfirm: () => deleteDoc(doc(db, 'buses', bus.id))
                      });
                    }}
                    className="p-2 md:p-3 text-error hover:bg-error-container rounded-2xl transition-all"
                  >
                    <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-1 bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm h-fit">
            <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center gap-3">
              <UserCheck className="text-primary" /> Add Staff
            </h2>
            <form onSubmit={handleAddStaff} className="space-y-4 md:space-y-6">
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Staff Type</label>
                <div className="flex bg-surface-container-low p-1 rounded-xl">
                  {['driver', 'conductor'].map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setNewStaff({...newStaff, type: t as any})}
                      className={cn("flex-1 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all capitalize", 
                        newStaff.type === t ? "bg-white shadow-sm" : "text-outline"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Full Name</label>
                <input 
                  type="text" required
                  value={newStaff.name}
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest block mb-2">Contact Number</label>
                <input 
                  type="tel" required
                  value={newStaff.contact}
                  onChange={e => setNewStaff({...newStaff, contact: e.target.value})}
                  className="w-full bg-surface-container-low p-3 md:p-4 rounded-2xl border-none focus:ring-2 ring-primary/20 text-sm"
                />
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary py-3 md:py-4 rounded-2xl font-bold hover:bg-primary-container transition-all text-sm">
                Register Staff
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[...drivers.map(d => ({...d, type: 'Driver'})), ...conductors.map(c => ({...c, type: 'Conductor'}))].map((s, i) => (
              <div key={i} className="bg-surface-container-lowest p-4 md:p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center", s.type === 'Driver' ? 'bg-primary-fixed text-primary' : 'bg-secondary-container text-secondary')}>
                    <UserCheck className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm md:text-base">{s.name}</p>
                    <p className="text-[10px] md:text-xs text-outline flex items-center gap-1"><Phone className="w-3 h-3" /> {s.contact}</p>
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-40">{s.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={buses.find(b => s.type === 'Driver' ? b.driverId === s.id : b.conductorId === s.id)?.id || ''}
                    onChange={async (e) => {
                      const busId = e.target.value;
                      try {
                        // 1. Clear previous assignment for this staff member from any other bus
                        const prevBus = buses.find(b => s.type === 'Driver' ? b.driverId === s.id : b.conductorId === s.id);
                        if (prevBus) {
                          await updateDoc(doc(db, 'buses', prevBus.id), {
                            [s.type === 'Driver' ? 'driverId' : 'conductorId']: ''
                          });
                        }
                        // 2. Assign to new bus
                        if (busId) {
                          const targetBus = buses.find(b => b.id === busId);
                          await updateDoc(doc(db, 'buses', busId), {
                            [s.type === 'Driver' ? 'driverId' : 'conductorId']: s.id
                          });
                          
                          // 3. Send Notification
                          if (targetBus) {
                            await sendStaffNotification(s.id, `You have been assigned to ${targetBus.operator} for the ${format(targetBus.departureTime.toDate(), 'HH:mm')} journey.`, s.contact);
                          }
                        }
                      } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, 'buses');
                      }
                    }}
                    className="bg-surface-container-low px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-[8px] md:text-[10px] font-bold border-none focus:ring-1 ring-primary/20 max-w-[100px] md:max-w-none"
                  >
                    <option value="">No Assignment</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.operator} ({format(b.departureTime.toDate(), 'HH:mm')})
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      setConfirmAction({
                        title: 'Delete Staff',
                        message: `Are you sure you want to remove ${s.name}?`,
                        onConfirm: () => deleteDoc(doc(db, s.type === 'Driver' ? 'drivers' : 'conductors', s.id))
                      });
                    }}
                    className="p-1.5 md:p-2 text-outline hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="bg-surface-container-lowest rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm overflow-hidden">
          <div className="p-4 md:p-8 border-b border-outline-variant/10 space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">User Management</h2>
                <p className="text-on-surface-variant text-xs md:text-sm">Manage user roles and permissions.</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-surface-container-low pl-10 pr-4 py-2 rounded-xl border-none focus:ring-2 ring-primary/20 text-sm"
                />
              </div>
            </div>
            
            <div className="bg-surface-container-low/50 p-3 md:p-4 rounded-2xl border border-outline-variant/10">
              <p className="text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest mb-3">Quick Promote by Email</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="email" 
                  placeholder="Enter email address..."
                  value={emailToPromote}
                  onChange={(e) => setEmailToPromote(e.target.value)}
                  className="flex-1 bg-surface-container-low px-4 py-2 rounded-xl border-none focus:ring-2 ring-primary/20 text-sm"
                />
                <button 
                  onClick={() => {
                    if (!emailToPromote) return;
                    const targetUser = users.find(u => u.email?.toLowerCase() === emailToPromote.toLowerCase());
                    if (!targetUser) {
                      notify('User not found. They must sign up first.', 'error');
                      return;
                    }
                    setConfirmAction({
                      title: 'Promote to Admin',
                      message: `Are you sure you want to promote ${targetUser.displayName || targetUser.email} to Admin?`,
                      onConfirm: async () => {
                        try {
                          await updateDoc(doc(db, 'users', targetUser.id), { role: 'admin' });
                          notify('User promoted to Admin successfully!', 'success');
                          setEmailToPromote('');
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.id}`);
                        }
                      }
                    });
                  }}
                  className="bg-primary text-on-primary px-6 py-2 rounded-xl font-bold text-sm hover:bg-primary-container transition-all whitespace-nowrap"
                >
                  Add Admin
                </button>
              </div>
            </div>
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-low text-[10px] md:text-xs font-bold text-outline uppercase tracking-widest">
                  <th className="px-6 md:px-8 py-4">User</th>
                  <th className="px-6 md:px-8 py-4">Email</th>
                  <th className="px-6 md:px-8 py-4">Current Role</th>
                  <th className="px-6 md:px-8 py-4">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {users.filter(u => 
                  u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || 
                  u.email?.toLowerCase().includes(userSearch.toLowerCase())
                ).map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold overflow-hidden text-xs md:text-base">
                          {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : u.displayName?.[0] || u.email?.[0]}
                        </div>
                        <p className="font-bold text-sm md:text-base">{u.displayName || 'Anonymous'}</p>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-6 text-xs md:text-sm">{u.email}</td>
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-black uppercase px-2 md:px-3 py-1 rounded-full",
                        u.role === 'admin' ? 'bg-primary-fixed text-primary' : 
                        u.role === 'driver' ? 'bg-secondary-container text-secondary' :
                        u.role === 'conductor' ? 'bg-tertiary-container text-tertiary' :
                        'bg-surface-container-highest text-outline'
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      {u.email !== 'gamamediaug@gmail.com' && (
                        <select 
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value as any;
                            setConfirmAction({
                              title: 'Change User Role',
                              message: `Are you sure you want to change ${u.displayName || u.email}'s role to ${newRole}?`,
                              onConfirm: async () => {
                                try {
                                  await updateDoc(doc(db, 'users', u.id), { role: newRole });
                                  notify('Role updated successfully!', 'success');
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.UPDATE, `users/${u.id}`);
                                }
                              }
                            });
                          }}
                          className="bg-surface-container-low px-3 py-1.5 rounded-xl text-xs font-bold border-none focus:ring-2 ring-primary/20"
                        >
                          <option value="client">Client</option>
                          <option value="admin">Admin</option>
                          <option value="driver">Driver</option>
                          <option value="conductor">Conductor</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-outline-variant/10">
            {users.filter(u => 
              u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || 
              u.email?.toLowerCase().includes(userSearch.toLowerCase())
            ).map((u) => (
              <div key={u.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold overflow-hidden text-sm">
                      {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : u.displayName?.[0] || u.email?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{u.displayName || 'Anonymous'}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                    u.role === 'admin' ? 'bg-primary-fixed text-primary' : 
                    u.role === 'driver' ? 'bg-secondary-container text-secondary' :
                    u.role === 'conductor' ? 'bg-tertiary-container text-tertiary' :
                    'bg-surface-container-highest text-outline'
                  )}>
                    {u.role}
                  </span>
                </div>
                
                {u.email !== 'gamamediaug@gmail.com' && (
                  <div className="flex items-center justify-between gap-4 bg-surface-container-low p-2 rounded-xl">
                    <span className="text-[10px] font-bold text-outline uppercase">Change Role</span>
                    <select 
                      value={u.role}
                      onChange={(e) => {
                        const newRole = e.target.value as any;
                        setConfirmAction({
                          title: 'Change Role',
                          message: `Change role to ${newRole}?`,
                          onConfirm: async () => {
                            try {
                              await updateDoc(doc(db, 'users', u.id), { role: newRole });
                              notify('Role updated successfully!', 'success');
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, `users/${u.id}`);
                            }
                          }
                        });
                      }}
                      className="bg-surface-container-highest px-3 py-1 rounded-lg text-[10px] font-bold border-none focus:ring-1 ring-primary/20"
                    >
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                      <option value="driver">Driver</option>
                      <option value="conductor">Conductor</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'complaints' && (
        <div className="space-y-6 md:space-y-8">
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Customer Complaints</h2>
            <div className="space-y-4 md:space-y-6">
              {complaints.map((c) => (
                <div key={c.id} className="p-4 md:p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-sm md:text-base">
                        {c.userName?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-base md:text-lg">{c.subject}</p>
                        <p className="text-[10px] md:text-xs text-on-surface-variant">From: {c.userName} • {format(c.createdAt.toDate(), 'MMM dd, HH:mm')}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[8px] md:text-[10px] font-black uppercase px-2 md:px-3 py-1 rounded-full",
                      c.status === 'resolved' ? 'bg-secondary-container text-secondary' : 'bg-error-container text-error'
                    )}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm md:text-base mb-6 leading-relaxed bg-surface p-3 md:p-4 rounded-2xl border border-outline-variant/5">
                    {c.message}
                  </p>
                  
                  {c.adminResponse ? (
                    <div className="bg-primary-fixed/10 p-3 md:p-4 rounded-2xl border border-primary/10">
                      <p className="text-[8px] md:text-[10px] font-bold text-primary uppercase mb-1">Admin Response</p>
                      <p className="text-xs md:text-sm italic">"{c.adminResponse}"</p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                      <input 
                        type="text" 
                        placeholder="Type your response..."
                        className="flex-1 bg-surface px-4 py-2.5 md:py-3 rounded-xl border border-outline-variant/20 text-sm"
                        value={respondingTo?.id === c.id ? responseMessage : ''}
                        onChange={(e) => {
                          setRespondingTo(c);
                          setResponseMessage(e.target.value);
                        }}
                      />
                      <button 
                        onClick={async () => {
                          if (!responseMessage) return;
                          try {
                            await updateDoc(doc(db, 'complaints', c.id), {
                              adminResponse: responseMessage,
                              status: 'resolved',
                              resolvedAt: serverTimestamp()
                            });
                            setResponseMessage('');
                            setRespondingTo(null);
                            notify('Response sent and complaint resolved!', 'success');
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, `complaints/${c.id}`);
                          }
                        }}
                        className="bg-primary text-on-primary px-6 py-2.5 md:py-3 rounded-xl font-bold text-sm hover:bg-primary-container transition-all"
                      >
                        Send Response
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {complaints.length === 0 && (
                <div className="text-center py-12 text-outline italic text-sm">No complaints found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {buses.map((bus) => (
              <div key={bus.id} className="bg-surface-container-lowest p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0">
                    <img 
                      src={bus.imageUrl || `https://picsum.photos/seed/${bus.operator.replace(/\s+/g, '-').toLowerCase()}/200/200`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt={bus.operator}
                    />
                  </div>
                  <div className={cn(
                    "px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase",
                    (bus.maintenance?.fuelLevel || 0) < 20 ? "bg-error-container text-error" : "bg-secondary-container text-secondary"
                  )}>
                    {(bus.maintenance?.healthStatus || 'Good').toUpperCase()}
                  </div>
                </div>
                
                <h3 className="text-lg md:text-xl font-bold mb-1 truncate">{bus.operator}</h3>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-[10px] md:text-xs text-outline">Kampala → Lira</p>
                  <p className="text-[8px] md:text-[10px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-lg truncate max-w-[100px]">
                    {drivers.find(d => d.id === bus.driverId)?.name || 'No Driver'}
                  </p>
                </div>

                <div className="space-y-4 md:space-y-6">
                  {/* Fuel Metrics */}
                  <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                    <div className="p-2 md:p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5 text-center">
                      <p className="text-[7px] md:text-[8px] font-bold text-outline uppercase mb-1">Issued</p>
                      <p className="text-xs md:text-sm font-black text-primary">{bus.tripData?.fuelIssued || 0}L</p>
                    </div>
                    <div className="p-2 md:p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5 text-center">
                      <p className="text-[7px] md:text-[8px] font-bold text-outline uppercase mb-1">Used</p>
                      <p className="text-xs md:text-sm font-black text-secondary">{Math.round(bus.tripData?.fuelConsumed || 0)}L</p>
                    </div>
                    <div className="p-2 md:p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5 text-center">
                      <p className="text-[7px] md:text-[8px] font-bold text-outline uppercase mb-1">Var</p>
                      <p className={cn(
                        "text-xs md:text-sm font-black",
                        (bus.tripData?.fuelVariance || 0) < 0 ? "text-error" : "text-primary"
                      )}>
                        {Math.round(bus.tripData?.fuelVariance || 0)}L
                      </p>
                    </div>
                  </div>

                  {/* Fuel Level */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] md:text-[10px] font-bold text-outline uppercase">
                      <span>Fuel Level</span>
                      <span className={cn((bus.maintenance?.fuelLevel || 0) < 20 && "text-error")}>{bus.maintenance?.fuelLevel || 0}%</span>
                    </div>
                    <div className="h-1.5 md:h-2 bg-surface-container-low rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-1000", (bus.maintenance?.fuelLevel || 0) < 20 ? "bg-error" : "bg-primary")}
                        style={{ width: `${bus.maintenance?.fuelLevel || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                      <p className="text-[8px] md:text-[10px] font-bold text-outline uppercase mb-1">Last Service</p>
                      <p className="text-[10px] md:text-xs font-bold">{bus.maintenance?.lastServiceDate ? format(bus.maintenance.lastServiceDate.toDate(), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                    <div className="p-2 md:p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                      <p className="text-[8px] md:text-[10px] font-bold text-outline uppercase mb-1">Next Service</p>
                      <p className="text-[10px] md:text-xs font-bold text-primary">{bus.maintenance?.nextServiceDate ? format(bus.maintenance.nextServiceDate.toDate(), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="p-3 md:p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-outline" />
                        <span className="text-[8px] md:text-[10px] font-bold text-outline uppercase">Mileage</span>
                      </div>
                      <span className="font-black text-xs md:text-sm">{(bus.maintenance?.mileage || 0).toLocaleString()} KM</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setConfirmAction({
                          title: 'Full Service Reset',
                          message: `Reset all maintenance and trip data for ${bus.operator}?`,
                          onConfirm: async () => {
                            try {
                              await updateDoc(doc(db, 'buses', bus.id), {
                                maintenance: {
                                  lastServiceDate: serverTimestamp(),
                                  nextServiceDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days later
                                  fuelLevel: 100,
                                  mileage: bus.maintenance?.mileage || 0, // Keep current mileage
                                  healthStatus: 'excellent'
                                },
                                tripData: {
                                  fuelIssued: 80, // Reset to standard 80L
                                  fuelConsumed: 0,
                                  fuelVariance: 80,
                                  distanceCovered: 0
                                }
                              });
                              notify(`${bus.operator} maintenance records updated!`, 'success');
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, `buses/${bus.id}`);
                            }
                          }
                        });
                      }}
                      className="flex-1 py-2.5 md:py-3 bg-surface-container-highest text-on-surface rounded-xl font-bold text-[10px] md:text-xs hover:bg-outline-variant/20 transition-all flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-3 h-3 md:w-4 md:h-4" /> Full Service
                    </button>
                    <button 
                      onClick={() => {
                        setEditingMaintenance(bus);
                        setMaintenanceForm({
                          fuelLevel: bus.maintenance?.fuelLevel || 0,
                          lastServiceDate: bus.maintenance?.lastServiceDate ? format(bus.maintenance.lastServiceDate.toDate(), 'yyyy-MM-dd') : '',
                          nextServiceDate: bus.maintenance?.nextServiceDate ? format(bus.maintenance.nextServiceDate.toDate(), 'yyyy-MM-dd') : '',
                          mileage: bus.maintenance?.mileage || 0,
                          healthStatus: bus.maintenance?.healthStatus || 'excellent',
                          fuelIssued: bus.tripData?.fuelIssued || 0
                        });
                      }}
                      className="p-2.5 md:p-3 bg-primary-fixed text-primary rounded-xl hover:bg-primary hover:text-on-primary transition-all"
                    >
                      <Plus className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
