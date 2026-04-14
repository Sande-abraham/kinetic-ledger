import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  role: 'admin' | 'client';
  walletBalance: number;
  walletPin?: string;
  createdAt: Timestamp;
}

export interface Bus {
  id: string;
  operator: string;
  route: string;
  imageUrl?: string;
  departureTime: Timestamp;
  price: number;
  totalSeats: number;
  seatNumbers: string[];
  bookedSeats: string[];
  driverId?: string;
  conductorId?: string;
  status?: 'idle' | 'on-trip' | 'arrived';
  progress?: number; // 0 to 100
  lastLocationUpdate?: Timestamp;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  tripData?: {
    fuelIssued: number; // Liters
    fuelConsumed: number; // Liters
    fuelVariance: number; // Liters
    distanceCovered: number; // KM
  };
  maintenance?: {
    lastServiceDate: Timestamp;
    nextServiceDate: Timestamp;
    fuelLevel: number; // 0 to 100
    mileage: number;
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved';
  adminResponse?: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface StaffNotification {
  id: string;
  staffId: string;
  message: string;
  type: 'assignment' | 'alert';
  read: boolean;
  createdAt: Timestamp;
}

export interface Booking {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  busId: string;
  busOperator: string;
  seatNumbers: string[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'PAID' | 'NOT PAID';
  paymentMethod?: string;
  transactionId?: string;
  refundAmount?: number;
  createdAt: Timestamp;
  departureTime: Timestamp;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'topup' | 'payment' | 'refund' | 'airtime' | 'data';
  description: string;
  createdAt: Timestamp;
}

export interface Driver {
  id: string;
  name: string;
  contact: string;
  assignedBusId?: string;
}

export interface Conductor {
  id: string;
  name: string;
  contact: string;
  assignedBusId?: string;
}
