"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import FleetMap from "@/components/dashboard/FleetMap";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function TaxiFleetMapPage() {
  return (
    <div className="bg-[#050508] min-h-screen flex flex-col pt-12 overflow-hidden">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col py-8 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/taxi" 
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={20} className="text-white" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Sledovanie Floty</h1>
              <p className="text-sm text-white/50">Real-time poloha taxíkov na mape lokačných dát</p>
            </div>
          </div>

          <div className="flex gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Roads Snapping Aktívny
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Live Dáta
             </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 min-h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl">
          <FleetMap />
        </div>
      </main>
    </div>
  );
}
