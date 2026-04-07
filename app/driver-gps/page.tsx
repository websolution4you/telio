"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Play, Square, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getDriversAction, updateDriverLocationAction } from "@/app/actions/drivers";

interface Driver {
  id: string;
  name: string;
}

export default function DriverGPSPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    async function loadDrivers() {
      const result = await getDriversAction();
      if (result.success && result.drivers) {
        setDrivers(result.drivers);
      } else {
        setError("Nepodarilo sa načítať zoznam vodičov.");
      }
      setIsLoading(false);
    }
    loadDrivers();
  }, []);

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const startTracking = () => {
    if (!selectedDriverId) {
      setError("Prosím, vyberte si vodiča.");
      return;
    }

    if (!navigator.geolocation) {
      setError("Váš prehliadač nepodporuje geolokáciu.");
      return;
    }

    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        setIsTracking(true);
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        setIsUpdating(true);
        const result = await updateDriverLocationAction(selectedDriverId, latitude, longitude);
        setIsUpdating(false);
        
        if (result.success) {
          setLastUpdated(new Date());
        }
      },
      (err) => {
        let msg = "Neznáma chyba GPS";
        if (err.code === 1) msg = "Prístup k polohe bol zamietnutý. Povoľte GPS v nastaveniach prehliadača pre telio.sk.";
        if (err.code === 2) msg = "Poloha nie je k dispozícii. Skontrolujte signál GPS.";
        if (err.code === 3) msg = "Čas na získanie polohy vypršal.";
        
        setError(`Chyba GPS: ${msg}`);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-sans selection:bg-cyan-500/30">
      <div className="max-w-md mx-auto pt-4 pb-12">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="p-2 rounded-xl bg-white/10 border border-white/20">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Driver GPS</h1>
            <p className="text-white/40 text-xs uppercase tracking-wider">Sledovanie vozidla</p>
          </div>
        </div>

        <div className="bg-[#111115] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-6">
          {/* Driver Selection */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold px-1">Vodič</label>
            <div className="relative">
               <select
                disabled={isTracking}
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none disabled:opacity-50"
              >
                <option value="">Vyberte zo zoznamu...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Panel */}
          <div className={`p-4 rounded-xl border ${isTracking ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${isTracking ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/30'}`}>
                {isTracking ? <Navigation size={20} className="animate-pulse" /> : <MapPin size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest leading-none">
                    {isTracking ? "Sledovanie Aktívne" : "Sledovanie Vypnuté"}
                  </p>
                  {isUpdating && <Loader2 size={12} className="text-cyan-400 animate-spin" />}
                </div>
                
                {isTracking && (
                  <p className="mt-1.5 text-[10px] text-cyan-400 font-medium">
                    {lastUpdated ? `Aktualizované: ${lastUpdated.toLocaleTimeString()}` : "Zisťujem polohu..."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200 leading-tight">{error}</p>
            </div>
          )}

          {/* Control Button */}
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all active:scale-95"
            >
              <Play size={18} fill="currentColor" />
              SPUSTIŤ SLEDOVANIE
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="w-full bg-red-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all active:scale-95"
            >
              <Square size={18} fill="currentColor" />
              ZASTAVIŤ
            </button>
          )}
        </div>

        <div className="mt-8 space-y-3 px-1">
          <div className="flex gap-3 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
            <p className="text-[11px] text-white/40 leading-relaxed text-center w-full">
              Nechajte túto stránku otvorenú v prehliadači vášho mobilu. 
              Váš pohyb sa bude automaticky vykresľovať na mape pre dispečera.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
