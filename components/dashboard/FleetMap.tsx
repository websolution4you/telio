import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, TrafficLayer } from '@react-google-maps/api';
import { taxiSupabase } from '@/lib/supabase';
import { Layers, Map as MapIcon, Globe, Info } from 'lucide-react';

// Map settings
const center = { lat: 49.023, lng: 20.590 };
const mapContainerStyle = { width: '100%', height: '100%' };

// Professional Silver Map Styles
const silverStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

// Futuristic Car SVG generator
const getCarIcon = (color: string, isLightMode: boolean) => {
  const svg = `
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Podsvietenie pod autom -->
      <ellipse cx="30" cy="30" rx="15" ry="25" fill="${color}" fill-opacity="${isLightMode ? '0.4' : '0.2'}" filter="url(#glow)" />
      
      <!-- Telo auta -->
      <path d="M22 18C22 15 24 13 27 12H33C36 12 38 15 38 18V42C38 45 36 47 33 48H27C24 47 22 45 22 42V18Z" fill="${color}" />
      
      <!-- Čelné sklo -->
      <path d="M24 20C24 19 25 18 26 18H34C35 18 36 19 36 20L35 26H25L24 20Z" fill="white" fill-opacity="0.4" />
      
      <!-- Strecha -->
      <rect x="25" y="28" width="10" height="12" rx="2" fill="white" fill-opacity="0.2" />
      
      <!-- Predné svetlá -->
      <rect x="23" y="13" width="4" height="2" rx="1" fill="white" />
      <rect x="33" y="13" width="4" height="2" rx="1" fill="white" />
      
      <!-- Bočné spätné zrkadlá -->
      <path d="M22 22H20V25H22V22Z" fill="${color}" />
      <path d="M38 22H40V25H38V22Z" fill="${color}" />
    </svg>
  `;
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
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey || "" });

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [mapMode, setMapMode] = useState<'silver' | 'satellite'>('silver');
  const [showTraffic, setShowTraffic] = useState(false);

  useEffect(() => {
    async function fetchDrivers() {
      const { data } = await taxiSupabase.from('drivers').select('*');
      if (data) setDrivers(data);
    }
    fetchDrivers();

    const channel = taxiSupabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
        if (payload.eventType === 'INSERT') setDrivers(prev => [...prev, payload.new as Driver]);
        else if (payload.eventType === 'UPDATE') setDrivers(prev => prev.map(d => d.id === payload.new.id ? (payload.new as Driver) : d));
        else if (payload.eventType === 'DELETE') setDrivers(prev => prev.filter(d => d.id !== payload.old.id));
      })
      .subscribe();

    return () => { taxiSupabase.removeChannel(channel); };
  }, []);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    fullscreenControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    styles: mapMode === 'silver' ? silverStyle : []
  }), [mapMode]);

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
        mapTypeId={mapMode === 'satellite' ? 'hybrid' : 'roadmap'}
      >
        {showTraffic && <TrafficLayer />}
        
        {drivers.map(driver => {
          const lat = driver.snapped_lat || driver.lat;
          const lng = driver.snapped_lng || driver.lng;
          if (!lat || !lng) return null;

          const isAvailable = driver.status === 'AVAILABLE' || driver.status === 'ONLINE';
          const iconColor = isAvailable ? '#0891b2' : '#be123c'; // Darker cyan/rose for better contrast on white

          return (
            <Marker
              key={driver.id}
              position={{ lat, lng }}
              title={`${driver.name} - ${driver.status}`}
              icon={{
                url: getCarIcon(iconColor, mapMode === 'silver'),
                scaledSize: new google.maps.Size(60, 60),
                anchor: new google.maps.Point(30, 30)
              }}
            />
          );
        })}
      </GoogleMap>

      {/* Floating Control Panel */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex gap-1 shadow-2xl">
          <button 
            onClick={() => setMapMode('silver')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${mapMode === 'silver' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5'}`}
          >
            <MapIcon size={14} /> Mapa
          </button>
          <button 
            onClick={() => setMapMode('satellite')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${mapMode === 'satellite' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5'}`}
          >
            <Globe size={14} /> Satelit
          </button>
        </div>

        <button 
          onClick={() => setShowTraffic(!showTraffic)}
          className={`bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl flex items-center justify-between shadow-2xl transition-all ${showTraffic ? 'ring-1 ring-cyan-500/50' : ''}`}
        >
          <div className="flex items-center gap-3">
             <Layers size={16} className={showTraffic ? 'text-cyan-400' : 'text-white/40'} />
             <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Doprava</span>
          </div>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${showTraffic ? 'bg-cyan-500' : 'bg-white/10'}`}>
            <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${showTraffic ? 'left-5' : 'left-1'}`} />
          </div>
        </button>
      </div>

      {/* Stats Overlay Re-styled for light map compatibility */}
      <div className="absolute bottom-10 left-6 z-10 bg-black/90 backdrop-blur-xl p-5 rounded-3xl border border-white/10 text-white min-w-[220px] shadow-2xl">
        <h3 className="text-[10px] font-black text-cyan-400 mb-4 uppercase tracking-[0.2em]">Live Status Flotily</h3>
        <div className="space-y-4">
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)] animate-pulse"></span>
               <span className="text-xs font-medium text-white/80">Voľní</span>
            </div>
            <b className="text-sm font-mono text-cyan-400">{drivers.filter(d => d.status === 'AVAILABLE' || d.status === 'ONLINE').length}</b>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]"></span>
               <span className="text-xs font-medium text-white/40">Zaujatie</span>
            </div>
            <b className="text-sm font-mono text-white/40">{drivers.filter(d => d.status !== 'AVAILABLE' && d.status !== 'ONLINE').length}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
