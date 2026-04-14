import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus } from '../types';
import { Bus as BusIcon } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const createBusIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div className="bg-primary p-2 rounded-full border-2 border-white shadow-lg">
      <BusIcon className="w-6 h-6 text-white" />
    </div>
  );
  return L.divIcon({
    html: iconMarkup,
    className: 'custom-bus-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const KAMPALA: [number, number] = [0.3476, 32.5825];
const LIRA: [number, number] = [2.2472, 32.9000];
const ROUTE: [number, number][] = [
  KAMPALA,
  [0.7167, 32.5333], // Luwero
  [1.2500, 32.2667], // Nakasongola
  [1.6500, 32.3667], // Karuma
  [2.0167, 32.6167], // Kamdini
  LIRA
];

const RecenterMap = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(coords);
  }, [coords, map]);
  return null;
};

export const LiveMap = ({ bus }: { bus: Bus }) => {
  const currentPos: [number, number] = bus.currentLocation 
    ? [bus.currentLocation.lat, bus.currentLocation.lng]
    : KAMPALA;

  return (
    <div className="h-[400px] w-full rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-inner relative">
      <MapContainer 
        center={currentPos} 
        zoom={8} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={ROUTE} color="#0040a1" weight={4} opacity={0.3} dashArray="10, 10" />
        <Marker position={KAMPALA}>
          <Popup>Kampala Terminal</Popup>
        </Marker>
        <Marker position={LIRA}>
          <Popup>Lira City Terminal</Popup>
        </Marker>
        <Marker position={currentPos} icon={createBusIcon()}>
          <Popup>
            <div className="font-bold">
              <p>{bus.operator}</p>
              <p className="text-primary text-xs">{bus.status === 'on-trip' ? 'In Transit' : 'At Terminal'}</p>
            </div>
          </Popup>
        </Marker>
        <RecenterMap coords={currentPos} />
      </MapContainer>
      
      <div className="absolute bottom-4 left-4 z-[1000] bg-surface/90 backdrop-blur-md p-4 rounded-2xl border border-outline-variant/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Live Status</p>
            <p className="text-xs font-bold">{bus.status === 'on-trip' ? 'Tracking Live' : 'Waiting for Departure'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
