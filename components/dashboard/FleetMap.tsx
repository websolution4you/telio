"use client";

import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { taxiSupabase } from '@/lib/supabase';

// Map settings
const center = { lat: 49.023, lng: 20.590 };
const mapContainerStyle = { width: '100%', height: '100%' };

// Enhanced Futuristic Dark Map Styles
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#0a0a0c" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#4e4e4e" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0a0a0c" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#1a1a1c" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#2a2a2c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
    { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] }
  ]
};

// Futuristic Car SVG generator
const getCarIcon = (color: string) => {
  // We use standard strings for the SVG to avoid issues with specialized chars in btoa
  const svg = `
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="14" fill="${color}" fill-opacity="0.15" />
      <circle cx="30" cy="30" r="22" stroke="${color}" stroke-opacity="0.1" stroke-width="1" />
      
      <path d="M30 15L36 22L35 44L30 41L25 44L24 22L30 15Z" fill="${color}" />
      <path d="M30 18L34 22L33 40L30 38L27 40L26 22L30 18Z" fill="white" fill-opacity="0.4" />
      
      <rect x="25" y="19" width="3" height="5" rx="1.5" fill="white" fill-opacity="0.9" />
      <rect x="32" y="19" width="3" height="5" rx="1.5" fill="white" fill-opacity="0.9" />
    </svg>
  `;
  // Using encodeURIComponent is safer for SVG data URIs
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

interface Driver {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  snapped_lat: number | null;
  snapped_lng: number | null;
}

export default function FleetMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || ""
  });

  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    async function fetchDrivers() {
      const { data } = await taxiSupabase.from('drivers').select('*');
      if (data) setDrivers(data);
    }
    fetchDrivers();

    const channel = taxiSupabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDrivers(prev => [...prev, payload.new as Driver]);
        } else if (payload.eventType === 'UPDATE') {
          setDrivers(prev => prev.map(d => d.id === payload.new.id ? (payload.new as Driver) : d));
        } else if (payload.eventType === 'DELETE') {
          setDrivers(prev => prev.filter(d => d.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { taxiSupabase.removeChannel(channel); };
  }, []);

  if (!apiKey) return <div className="p-8 text-red-500 bg-[#050508] h-full flex items-center justify-center font-bold">MISSING API KEY</div>;
  if (loadError) return <div className="p-8 text-red-500 h-full flex items-center justify-center font-bold">LOADING ERROR</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-[#050508] text-cyan-400 gap-4"><div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>Loading Fleet Map...</div>;

  return (
    <div className="w-full h-full relative group">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        options={mapOptions}
      >
        {drivers.map(driver => {
          const lat = driver.snapped_lat || driver.lat;
          const lng = driver.snapped_lng || driver.lng;
          if (!lat || !lng) return null;

          const isAvailable = driver.status === 'AVAILABLE' || driver.status === 'ONLINE';
          const iconColor = isAvailable ? '#22d3ee' : '#f43f5e'; // Cyan for available, Rose for busy

          return (
            <Marker
              key={driver.id}
              position={{ lat, lng }}
              title={`${driver.name} - ${driver.status}`}
              icon={{
                url: getCarIcon(iconColor),
                scaledSize: new google.maps.Size(60, 60),
                anchor: new google.maps.Point(30, 30)
              }}
            />
          );
        })}
      </GoogleMap>

      {/* Overlay Stats - Sleeker Version */}
      <div className="absolute top-6 left-6 z-10 bg-black/70 backdrop-blur-xl p-5 rounded-3xl border border-white/10 text-white min-w-[200px] shadow-2xl">
        <h3 className="text-[10px] font-black text-cyan-400 mb-3 uppercase tracking-[0.2em]">Stav Flotily</h3>
        <div className="space-y-3">
           <div className="flex items-center justify-between group/item">
            <div className="flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] animate-pulse"></span>
               <span className="text-xs text-white/70">Dostupní</span>
            </div>
            <b className="text-sm font-mono text-cyan-400">{drivers.filter(d => d.status === 'AVAILABLE' || d.status === 'ONLINE').length}</b>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
               <span className="text-xs text-white/50">Zaneprázdnení</span>
            </div>
            <b className="text-sm font-mono text-white/40">{drivers.filter(d => d.status !== 'AVAILABLE' && d.status !== 'ONLINE').length}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
