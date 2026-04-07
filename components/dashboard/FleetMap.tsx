"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { taxiSupabase } from '@/lib/supabase';

// Map settings
const center = { lat: 49.023, lng: 20.590 };
const mapContainerStyle = { width: '100%', height: '100%' };
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
  ]
};

interface Driver {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  snapped_lat: number | null;
  snapped_lng: number | null;
  last_update: string;
}

export default function FleetMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || ""
  });

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 1. Initial Load of drivers
  useEffect(() => {
    async function fetchDrivers() {
      const { data, error } = await taxiSupabase
        .from('drivers')
        .select('*');
      
      if (data) setDrivers(data);
    }
    fetchDrivers();

    // 2. Real-time subscription
    const channel = taxiSupabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        (payload) => {
          console.log('Realtime change received!', payload);
          if (payload.eventType === 'INSERT') {
            setDrivers(prev => [...prev, payload.new as Driver]);
          } else if (payload.eventType === 'UPDATE') {
            setDrivers(prev => prev.map(d => d.id === payload.new.id ? (payload.new as Driver) : d));
          } else if (payload.eventType === 'DELETE') {
            setDrivers(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      taxiSupabase.removeChannel(channel);
    };
  }, []);

  if (!apiKey) return <div className="p-8 text-red-500 bg-[#050508] h-full flex items-center justify-center">Chýba Google Maps API Key</div>;
  if (loadError) return <div className="p-8 text-red-500 h-full flex items-center justify-center">Chyba pri načítaní Mapy</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-[#050508] text-cyan-400 gap-4"><div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>Loading Map...</div>;

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        onLoad={setMap}
        options={mapOptions}
      >
        {drivers.map(driver => {
          // Use snapped coordinates if available, otherwise raw
          const pos = {
            lat: driver.snapped_lat || driver.lat,
            lng: driver.snapped_lng || driver.lng
          };

          // Skip if no coordinates
          if (!pos.lat || !pos.lng) return null;

          return (
            <Marker
              key={driver.id}
              position={pos}
              title={`${driver.name} (${driver.status})`}
              icon={{
                url: driver.status === 'AVAILABLE' 
                  ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' 
                  : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(40, 40)
              }}
            />
          );
        })}
      </GoogleMap>

      {/* Overlay Stats */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white">
        <h3 className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-widest">Stav Flotily</h3>
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <b>{drivers.filter(d => d.status === 'AVAILABLE').length}</b> Voľní vodiči
          </div>
          <div className="flex items-center gap-2 text-xs opacity-60">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <b>{drivers.filter(d => d.status !== 'AVAILABLE').length}</b> Zastavení/Zaujatie
          </div>
        </div>
      </div>
    </div>
  );
}
