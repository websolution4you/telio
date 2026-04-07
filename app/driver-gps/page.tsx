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

  // Fetch drivers on mount
  useEffect(() => {
    async function loadDrivers() {
      const result = await getDriversAction();
      if (result.success && result.drivers) {
        setDrivers(result.drivers);
      } else {
        setError(result.error || "Nepodarilo sa načítať zoznam vodičov.");
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
    setIsTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        setIsUpdating(true);
        const result = await updateDriverLocationAction(selectedDriverId, latitude, longitude);
        setIsUpdating(false);
        
        if (result.success) {
          setLastUpdated(new Date());
        } else {
          console.error("Failed to update location:", result.error);
        }
      },
      (err) => {
        setError(`Chyba GPS: ${err.message}`);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
  };

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <p className="text-white/60 font-medium">Načítavam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-sans selection:bg-cyan-500/30">
      <div className="max-w-md mx-auto pt-8 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/" 
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronLeft size={20} className="text-white/70" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Driver GPS</h1>
            <p className="text-white/40 text-sm">Sledovanie polohy vozidla</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          {/* Background Highlight */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-cyan-500/20 transition-colors duration-1000"></div>
          
          <div className="relative z-10 space-y-8">
            {/* Driver Selection */}
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-white/40 font-bold px-1">Kto ste?</label>
              <select
                disabled={isTracking}
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Vyberte vodiča...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Panel */}
            <div className={`p-4 rounded-2xl border transition-all duration-500 ${isTracking ? 'bg-cyan-500/1 border-cyan-500/20' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl transition-colors duration-500 ${isTracking ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' : 'bg-white/5 text-white/30'}`}>
                  {isTracking ? <Navigation size={24} /> : <MapPin size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white/80 uppercase tracking-wide">
                      {isTracking ? "Sledovanie Aktívne" : "Sledovanie Vypnuté"}
                    </p>
                    {isUpdating && <Loader2 size={14} className="text-cyan-400 animate-spin" />}
                  </div>
                  
                  {isTracking && location ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-white/40 font-mono">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                      {lastUpdated && (
                        <p className="text-[10px] text-cyan-400 font-medium">
                          Posledná aktualizácia: {lastUpdated.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-white/30">
                      Kliknite na tlačidlo nižšie pre spustenie GPS
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200/80">{error}</p>
              </div>
            )}

            {/* Control Button */}
            {!isTracking ? (
              <button
                onClick={startTracking}
                className="w-full bg-white text-black py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                <Play size={20} fill="currentColor" />
                SPUSTIŤ SLEDOVANIE
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95"
              >
                <Square size={20} fill="currentColor" className="text-red-500" />
                ZASTAVIŤ
              </button>
            )}
          </div>
        </div>

        {/* Info Text */}
        <div className="mt-8 space-y-4 px-2">
          <div className="flex gap-4">
            <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-1" />
            <p className="text-xs text-white/40 leading-relaxed">
              Túto stránku si nechajte otvorenú na mobile v aute. Pre najlepšiu presnosť odporúčame mať telefón s výhľadom na oblohu.
            </p>
          </div>
          <div className="flex gap-4">
            <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-1" />
            <p className="text-xs text-white/40 leading-relaxed">
              Poloha sa aktualizuje automaticky pri každej zmene. Na Dashboarde uvidíte auto v reálnom čase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
