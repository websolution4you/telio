"use client";

import { useState, useCallback, useEffect } from "react";
import { Phone, PhoneOff, Loader2, Sparkles, Settings, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceAuraWidgetProps {
  initialAgentId?: string;
}

export default function VoiceAuraWidget({
  initialAgentId = "21m00Tcm4TlvDq8ikWAM" // Default ElevenLabs voice agent placeholder
}: VoiceAuraWidgetProps) {
  const [agentId, setAgentId] = useState(initialAgentId);
  const [status, setStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [conversation, setConversation] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Stop session on unmount
  useEffect(() => {
    return () => {
      if (conversation) {
        conversation.endSession().catch(console.error);
      }
    };
  }, [conversation]);

  const handleStartCall = useCallback(async () => {
    try {
      setStatus("connecting");
      setErrorMsg("");

      // Permission check - verify audio permissions and immediately close the temporary stream
      const permStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permStream.getTracks().forEach(track => track.stop());

      // Dynamic import to prevent nextjs SSR issues
      const { Conversation } = await import("@elevenlabs/client");

      const conv = await Conversation.startSession({
        agentId: agentId,
        connectionType: "webrtc",
        dynamicVariables: {
          call_sid: "esthetic_web_" + Math.random().toString(36).substring(7),
          caller_number: "web-client-esthetic",
          from_number: "web-client-esthetic"
        },
        onConnect: () => {
          setStatus("active");
          console.log("ElevenLabs Esthetic: Connected");
        },
        onDisconnect: () => {
          setStatus("idle");
          setConversation(null);
          console.log("ElevenLabs Esthetic: Disconnected");
        },
        onError: (error: any) => {
          console.error("ElevenLabs Esthetic Error:", error);
          setErrorMsg(typeof error === "string" ? error : "Chyba pri nadviazaní hovoru.");
          setStatus("error");
        },
        onModeChange: (mode: any) => {
          console.log("ElevenLabs Esthetic: Mode changed to", mode);
        },
      });

      setConversation(conv);
    } catch (error: any) {
      console.error("ElevenLabs Esthetic: Failed to start session:", error);
      setStatus("error");
      setErrorMsg(error.message || "Nepodarilo sa spustiť hovor. Skontrolujte prístup k mikrofónu.");
    }
  }, [agentId]);

  const handleEndCall = useCallback(async () => {
    if (conversation) {
      try {
        await conversation.endSession();
      } catch (e) {
        console.error("Error ending session:", e);
      }
      setConversation(null);
    }
    setStatus("idle");
  }, [conversation]);

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-3xl p-8 border backdrop-blur-xl transition-all duration-500 hover:border-amber-500/20"
      style={{
        background: "linear-gradient(135deg, rgba(20, 16, 26, 0.7) 0%, rgba(12, 10, 15, 0.9) 100%)",
        borderColor: "rgba(224, 180, 120, 0.12)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      }}
    >
      {/* Background glow styling tailored for clinic theme */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden -z-10">
        <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full blur-[100px] opacity-20 bg-amber-300" />
        <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full blur-[100px] opacity-15 bg-rose-400" />
      </div>

      <div className="flex flex-col items-center text-center">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full border text-[10px] uppercase font-bold tracking-[0.2em]"
          style={{
            borderColor: "rgba(224, 180, 120, 0.2)",
            background: "rgba(224, 180, 120, 0.05)",
            color: "#E0B478"
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Telio Hlasový Asistent</span>
        </div>

        <h3 className="text-xl md:text-2xl font-serif text-amber-50/90 tracking-wide mb-2">
          Konzultácia s Hlasovým Asistentom
        </h3>
        
        <p className="text-xs text-stone-400 max-w-sm mb-8 leading-relaxed">
          Náš inteligentný asistent vám poskytne všetky detaily o zákrokoch, preverí voľné kapacity a zarezervuje vám priamo termín konzultácie s doktorkou.
        </p>

        {/* Dynamic State Layouts */}
        <div className="relative w-full flex flex-col items-center justify-center min-h-[220px]">
          
          {/* Wave Aura when active */}
          <AnimatePresence>
            {status === "active" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Visual pulsating circles to create high-end aesthetic feedback */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full border"
                    style={{
                      width: 140,
                      height: 140,
                      borderColor: "rgba(224, 180, 120, 0.4)",
                      background: "radial-gradient(circle, rgba(224, 180, 120, 0.08) 0%, transparent 70%)"
                    }}
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{
                      scale: [1, 2.5 + i * 0.5],
                      opacity: [0.6, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      delay: i * 0.9,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* Subtler inner glow */}
                <motion.div 
                  className="w-40 h-40 rounded-full blur-[20px] opacity-40 absolute"
                  style={{ background: "radial-gradient(circle, rgba(224, 180, 120, 0.4) 0%, transparent 75%)" }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Interactive Button */}
          <div className="z-10 relative flex flex-col items-center">
            {status === "idle" || status === "error" ? (
              <button
                onClick={handleStartCall}
                className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative group overflow-hidden cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #E0B478 0%, #C99757 100%)",
                  boxShadow: "0 10px 30px rgba(201, 151, 87, 0.3)"
                }}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <Phone className="w-10 h-10 text-stone-950 relative z-10 transition-transform group-hover:scale-110 duration-300" />
              </button>
            ) : status === "connecting" ? (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center opacity-85"
                style={{
                  background: "linear-gradient(135deg, #443c32 0%, #2b251e 100%)",
                  border: "1px solid rgba(224, 180, 120, 0.3)"
                }}
              >
                <Loader2 className="w-10 h-10 animate-spin text-amber-300" />
              </div>
            ) : (
              <button
                onClick={handleEndCall}
                className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative group"
                style={{
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  boxShadow: "0 10px 30px rgba(239, 68, 68, 0.4)"
                }}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <PhoneOff className="w-10 h-10 text-white relative z-10 animate-pulse" />
              </button>
            )}

            {/* Label below button */}
            <span className="mt-6 text-sm font-semibold tracking-wider"
              style={{ color: status === "active" ? "#E0B478" : "#F5EFE6" }}
            >
              {status === "idle" && "Spustiť Hovor"}
              {status === "connecting" && "Pripájanie..."}
              {status === "active" && "Prebieha Hovor (Asistent počúva)"}
              {status === "error" && "Skúsiť Znova"}
            </span>

            {/* Interactive Audio feedback hint */}
            {status === "active" && (
              <div className="mt-2 flex items-center gap-1.5 justify-center text-[10px] text-stone-400 font-medium tracking-wide">
                <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                Hovorte priamo do mikrofónu
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {status === "error" && errorMsg && (
          <p className="mt-4 text-xs text-red-400 bg-red-950/20 border border-red-900/30 px-4 py-2 rounded-xl text-center max-w-sm">
            {errorMsg}
          </p>
        )}

        {/* Divider / Agent Settings config toggle */}
        <div className="w-full border-t mt-8 pt-4 flex flex-col items-center" style={{ borderColor: "rgba(224, 180, 120, 0.1)" }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-300 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Nastavenia ID ElevenLabs Agenta</span>
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full mt-4 overflow-hidden"
              >
                <div className="flex flex-col gap-2 p-3 bg-stone-950/40 rounded-2xl border border-amber-500/10">
                  <label className="text-[10px] text-amber-200/70 font-semibold uppercase tracking-wider">
                    ElevenLabs Agent ID:
                  </label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder="Sem vložte ID agenta z ElevenLabs"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-900 border text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-400/50"
                    style={{ borderColor: "rgba(224, 180, 120, 0.2)" }}
                  />
                  <p className="text-[9px] text-stone-500 leading-normal">
                    Po výmene tohto ID za ID z vášho ElevenLabs účtu bude hovor okamžite smerovaný na nového agenta estetickej kliniky.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
