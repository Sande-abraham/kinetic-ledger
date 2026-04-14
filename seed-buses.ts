import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const firebaseConfig = JSON.parse(readFileSync(join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const buses = [
  {
    operator: "Ledger Morning",
    route: "Kampala-Lira",
    departureTime: Timestamp.fromDate(new Date(new Date().setHours(6, 0, 0, 0) + 86400000)),
    price: 35000,
    totalSeats: 30,
    seatNumbers: Array.from({ length: 30 }, (_, i) => `${i < 15 ? 'A' : 'B'}${ (i % 15) + 1}`),
    bookedSeats: ["A1", "A2", "B5"],
    driverId: "",
    conductorId: ""
  },
  {
    operator: "Kinetic Express",
    route: "Kampala-Lira",
    departureTime: Timestamp.fromDate(new Date(new Date().setHours(9, 30, 0, 0) + 86400000)),
    price: 40000,
    totalSeats: 30,
    seatNumbers: Array.from({ length: 30 }, (_, i) => `${i < 15 ? 'A' : 'B'}${ (i % 15) + 1}`),
    bookedSeats: ["A10", "B12"],
    driverId: "",
    conductorId: ""
  },
  {
    operator: "Lira Premier",
    route: "Kampala-Lira",
    departureTime: Timestamp.fromDate(new Date(new Date().setHours(14, 0, 0, 0) + 86400000)),
    price: 35000,
    totalSeats: 30,
    seatNumbers: Array.from({ length: 30 }, (_, i) => `${i < 15 ? 'A' : 'B'}${ (i % 15) + 1}`),
    bookedSeats: [],
    driverId: "",
    conductorId: ""
  },
  {
    operator: "Night Owl",
    route: "Kampala-Lira",
    departureTime: Timestamp.fromDate(new Date(new Date().setHours(21, 0, 0, 0) + 86400000)),
    price: 45000,
    totalSeats: 30,
    seatNumbers: Array.from({ length: 30 }, (_, i) => `${i < 15 ? 'A' : 'B'}${ (i % 15) + 1}`),
    bookedSeats: ["A1", "A2", "A3", "A4", "A5"],
    driverId: "",
    conductorId: ""
  },
  {
    operator: "Executive Ledger",
    route: "Kampala-Lira",
    departureTime: Timestamp.fromDate(new Date(new Date().setHours(11, 0, 0, 0) + 172800000)),
    price: 50000,
    totalSeats: 30,
    seatNumbers: Array.from({ length: 30 }, (_, i) => `${i < 15 ? 'A' : 'B'}${ (i % 15) + 1}`),
    bookedSeats: ["B1", "B2"],
    driverId: "",
    conductorId: ""
  }
];

async function seed() {
  for (const bus of buses) {
    await addDoc(collection(db, 'buses'), bus);
    console.log(`Added bus: ${bus.operator}`);
  }
  process.exit(0);
}

seed();
