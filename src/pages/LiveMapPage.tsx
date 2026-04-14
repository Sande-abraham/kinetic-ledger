import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'motion/react';
import { Bus, MapPin, Navigation, Clock, Shield, Info } from 'lucide-react';
import { cn } from '../lib/utils';

// Fix Leaflet icon issue
import 'leaflet/dist/leaflet.css';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const busIcon = new L.DivIcon({
  html: `<div class="bg-primary p-2 rounded-full shadow-lg border-2 border-white animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10c0-1.1.9-2 2-2z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
         </div>`,
  className: 'custom-bus-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const stationIcon = new L.DivIcon({
  html: `<div class="bg-secondary p-1.5 rounded-full shadow-md border-2 border-white">
          <div class="w-2 h-2 bg-white rounded-full"></div>
         </div>`,
  className: 'custom-station-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Kampala to Lira Route Coordinates (Simplified)
const ROUTE_COORDS: [number, number][] = [
  [0.3476, 32.5825], // Kampala
  [0.6750, 32.5000], // Bombo
  [0.8500, 32.4500], // Luwero
  [1.1500, 32.4000], // Nakasongola
  [2.2333, 32.3833], // Karuma
  [2.2472, 32.9000], // Lira
];

const STATIONS = [
  { name: 'Kampala Terminal', coords: [0.3476, 32.5825], type: 'Main' },
  { name: 'Luwero Stop', coords: [0.8500, 32.4500], type: 'Rest' },
  { name: 'Karuma Bridge', coords: [2.2333, 32.3833], type: 'Checkpoint' },
  { name: 'Lira City Terminal', coords: [2.2472, 32.9000], type: 'Main' },
];

export const LiveMapPage = () => {
  const [busPos, setBusPos] = React.useState<[number, number]>(ROUTE_COORDS[0]);
  const [progress, setProgress] = React.useState(0);
  const [speed, setSpeed] = React.useState(65);
  const [eta, setEta] = React.useState('2h 15m');

  // Simulate bus movement
  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 0.001;
        if (next >= 1) return 0;
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Calculate position along the polyline
  React.useEffect(() => {
    const totalPoints = ROUTE_COORDS.length - 1;
    const currentSegment = Math.floor(progress * totalPoints);
    const segmentProgress = (progress * totalPoints) % 1;

    if (currentSegment < totalPoints) {
      const start = ROUTE_COORDS[currentSegment];
      const end = ROUTE_COORDS[currentSegment + 1];
      
      const lat = start[0] + (end[0] - start[0]) * segmentProgress;
      const lng = start[1] + (end[1] - start[1]) * segmentProgress;
      
      setBusPos([lat, lng]);
      
      // Randomly vary speed slightly
      setSpeed(Math.floor(60 + Math.random() * 15));
    }
  }, [progress]);

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Sidebar Info */}
        <div className="lg:w-80 space-y-6 overflow-y-auto pr-2">
          <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary p-2.5 rounded-xl">
                <Navigation className="w-5 h-5 text-on-primary" />
              </div>
              <h2 className="text-xl font-black tracking-tight">Live Tracking</h2>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Current Speed</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-primary">{speed}</span>
                  <span className="text-xs font-bold text-outline mb-1">km/h</span>
                </div>
              </div>

              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Estimated Arrival</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  <span className="text-xl font-black text-on-surface">{eta}</span>
                </div>
              </div>

              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Security Status</p>
                <div className="flex items-center gap-2 text-green-600">
                  <Shield className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">All Systems Secure</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/10">
            <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-6">Route Stations</h3>
            <div className="space-y-6 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-outline-variant/30" />
              {STATIONS.map((station, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 border-surface z-10 mt-1",
                    i === 0 ? "bg-primary" : i === STATIONS.length - 1 ? "bg-secondary" : "bg-outline-variant"
                  )} />
                  <div>
                    <p className="text-sm font-bold text-on-surface">{station.name}</p>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest">{station.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0" />
            <p className="text-[10px] font-medium text-on-surface-variant leading-relaxed">
              GPS data is updated every 10 seconds. Actual arrival times may vary due to traffic or weather conditions.
            </p>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 bg-surface-container-low rounded-[48px] overflow-hidden border border-outline-variant/10 shadow-2xl relative">
          <MapContainer 
            center={[1.2, 32.6]} 
            zoom={8} 
            scrollWheelZoom={true}
            className="w-full h-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <Polyline 
              positions={ROUTE_COORDS} 
              color="#0040a1" 
              weight={4} 
              opacity={0.4} 
              dashArray="10, 10"
            />

            {STATIONS.map((station, i) => (
              <Marker key={i} position={station.coords as [number, number]} icon={stationIcon}>
                <Popup>
                  <div className="p-2">
                    <p className="font-black text-sm">{station.name}</p>
                    <p className="text-[10px] uppercase font-bold text-outline">{station.type} Station</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            <Marker position={busPos} icon={busIcon}>
              <Popup>
                <div className="p-2">
                  <p className="font-black text-sm text-primary">Kinetic Express #402</p>
                  <p className="text-[10px] uppercase font-bold text-outline">En Route to Lira</p>
                  <div className="mt-2 pt-2 border-t border-outline-variant/20">
                    <p className="text-[10px] font-bold">Speed: {speed} km/h</p>
                    <p className="text-[10px] font-bold">ETA: {eta}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Map Overlays */}
          <div className="absolute top-6 left-6 z-10">
            <div className="bg-surface/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-outline-variant/20 flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">Live: Kampala → Lira</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
