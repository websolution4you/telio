"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, MarkerClusterer, Polyline } from '@react-google-maps/api';

const center = {
  lat: 49.023, 
  lng: 20.590
};

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#212121" }]
    },
    {
      "elementType": "labels.icon",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#212121" }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#2c2c2c" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#3c3c3c" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#000000" }]
    }
  ]
};

// Mock data pre taxíky
const MOCK_DRIVERS = [
  { id: '1', name: 'Ján S.', lat: 49.0232, lng: 20.5895, status: 'AVAILABLE' },
  { id: '2', name: 'Peter M.', lat: 49.0245, lng: 20.5942, status: 'BUSY' },
  { id: '3', name: 'Marek B.', lat: 49.0211, lng: 20.5851, status: 'AVAILABLE' },
];

export default function FleetMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || ""
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    console.log("Google Map loaded successfully.");
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  if (!apiKey) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050508] text-red-500 p-8 text-center border-2 border-dashed border-red-500/20 rounded-2xl">
        <h3 className="text-xl font-bold mb-2">Google Maps API Key Chýba!</h3>
        <p className="text-sm opacity-80 mb-4 max-w-sm">Vercel/Render potrebuje premennú <b>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</b>. Skontrolujte nastavenia projektu.</p>
        <div className="px-4 py-2 bg-red-500/10 rounded-lg text-xs font-mono">Status: UNDEFINED</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050508] text-red-500 p-8 text-center">
        <h3 className="text-xl font-bold mb-2">Chyba pri načítaní Mapy</h3>
        <p className="text-sm opacity-80">{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#050508] text-cyan-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm tracking-widest uppercase font-bold">Inicializácia Google Maps...</div>
        <div className="text-[10px] opacity-40">API Key: PRÍTOMNÝ (OK)</div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {MOCK_DRIVERS.map(driver => (
          <Marker
            key={driver.id}
            position={{ lat: driver.lat, lng: driver.lng }}
            title={`${driver.name} (${driver.status})`}
            icon={{
              url: driver.status === 'AVAILABLE' 
                ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' 
                : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new google.maps.Size(40, 40)
            }}
          />
        ))}
      </GoogleMap>
      
      {/* Overlay controls */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h3 className="text-sm font-bold text-cyan-400 mb-2">Taxi Flota</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {MOCK_DRIVERS.filter(d => d.status === 'AVAILABLE').length} Voľní
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {MOCK_DRIVERS.filter(d => d.status === 'BUSY').length} Na jazde
          </div>
        </div>
      </div>
    </div>
  );
}
