import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, TrafficLayer } from '@react-google-maps/api';
import { taxiSupabase } from '@/lib/supabase';
import { Layers, Map as MapIcon, Globe, Info } from 'lucide-react';

// Map settings
const center = { lat: 49.023, lng: 20.590 };
const mapContainerStyle = { width: '100%', height: '100%' };

// Warm/Cream Map Styles (Matching provided aesthetic)
const warmStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f2efe9" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#523719" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f2efe9" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#c9b2a6" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#ffeb3b" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#fbc02d" }] },
  { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#b9d3c2" }] },
  { "featureType": "poi", "elementType": "labels.icon", "stylers": [{ "visibility": "on" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#93817c" }] }
];

// Modern Sedan SVG generator
const getCarIcon = (color: string) => {
  const svg = `
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <g transform="rotate(0, 30, 30)">
        <ellipse cx="30" cy="32" rx="14" ry="24" fill="${color}" fill-opacity="0.3" filter="url(#glow)" />
        <rect x="20" y="12" width="20" height="38" rx="3" fill="${color}" stroke="white" stroke-width="1.2" />
        <path d="M22 22C22 20 24 19 30 19C36 19 38 20 38 22L37 28H23L22 22Z" fill="white" fill-opacity="0.6" stroke="white" stroke-width="0.5" />
      </g>
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
  const [mapMode, setMapMode] = useState<'warm' | 'satellite'>('warm');
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
    styles: mapMode === 'warm' ? warmStyle : []
  }), [mapMode]);

  if (!apiKey) return <div className="p-8 text-red-500 bg-[#f2efe9] h-full flex items-center justify-center font-bold">MISSING API KEY</div>;
  if (loadError) return <div className="p-8 text-red-500 h-full flex items-center justify-center font-bold">LOADING ERROR</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-[#f2efe9] text-[#523719] gap-4"><div className="w-10 h-10 border-4 border-[#523719] border-t-transparent rounded-full animate-spin"></div>Načítavam mapu flotily...</div>;

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
          const iconColor = isAvailable ? '#22c55e' : '#ef4444'; // Green for available, Red for busy

          return (
            <Marker
              key={driver.id}
              position={{ lat, lng }}
              title={`${driver.name} - ${driver.status}`}
              icon={{
                url: getCarIcon(iconColor),
                scaledSize: new google.maps.Size(50, 50),
                anchor: new google.maps.Point(25, 25)
              }}
            />
          );
        })}
      </GoogleMap>

      {/* Floating Control Panel */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <div className="bg-white border border-gray-200 p-1.5 rounded-2xl flex gap-1 shadow-xl">
          <button 
            onClick={() => setMapMode('warm')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mapMode === 'warm' ? 'bg-[#523719] text-white' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            LIGHT
          </button>
          <button 
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mapMode === 'satellite' ? 'bg-[#523719] text-white' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            SATELLITE
          </button>
        </div>

        <button 
          onClick={() => setShowTraffic(!showTraffic)}
          className={`bg-white border border-gray-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-xl transition-all ${showTraffic ? 'border-[#523719]' : ''}`}
        >
          <div className="flex items-center gap-3">
             <Layers size={16} className={showTraffic ? 'text-[#523719]' : 'text-gray-400'} />
             <span className="text-[10px] font-black uppercase tracking-widest text-[#523719]">Doprava</span>
          </div>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${showTraffic ? 'bg-[#523719]' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${showTraffic ? 'left-5' : 'left-1'}`} />
          </div>
        </button>
      </div>

      {/* Stats Overlay Re-styled for light map compatibility */}
      <div className="absolute top-6 left-6 z-10 bg-white border border-gray-200 p-5 rounded-3xl text-[#523719] min-w-[220px] shadow-xl">
        <h3 className="text-[10px] font-black text-[#523719] mb-4 uppercase tracking-[0.2em] opacity-60">STAV FLOTILY</h3>
        <div className="space-y-4">
           <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-3">
               <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></span>
               <span className="text-xs uppercase tracking-widest">Voľní vodiči</span>
            </div>
            <b className="text-sm font-mono">{drivers.filter(d => d.status === 'AVAILABLE' || d.status === 'ONLINE').length}</b>
          </div>
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-3">
               <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
               <span className="text-xs uppercase tracking-widest">Obsadení vodiči</span>
            </div>
            <b className="text-sm font-mono">{drivers.filter(d => d.status !== 'AVAILABLE' && d.status !== 'ONLINE').length}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
