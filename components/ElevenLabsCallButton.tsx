"use client";

import { useState, useCallback } from "react";
import { Conversation } from "@11labs/client";
import { useLang } from "@/lib/i18n";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

interface ElevenLabsCallButtonProps {
    agentId: string;
    customLabel?: string;
    icon?: React.ReactNode;
    color?: string;
}

export default function ElevenLabsCallButton({
    agentId,
    customLabel,
    icon,
    color = "#7B61FF"
}: ElevenLabsCallButtonProps) {
    const { t } = useLang();
    const [status, setStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [client, setClient] = useState<any>(null); // Fallback to any to avoid TS issues if Conversation return type differs

    const handleStartCall = useCallback(async () => {
        try {
            setStatus("connecting");
            setErrorMsg("");

            // Ask for microphone permission explicitly if needed
            await navigator.mediaDevices.getUserMedia({ audio: true });

            const newClient = await Conversation.startSession({
                agentId: agentId,
                onConnect: () => {
                    setStatus("active");
                    console.log("ElevenLabs: Connected");
                },
                onDisconnect: () => {
                    setStatus("idle");
                    console.log("ElevenLabs: Disconnected");
                },
                onError: (error) => {
                    console.error("ElevenLabs: Error:", error);
                    setErrorMsg(typeof error === "string" ? error : "Chyba pri hovore");
                    setStatus("error");
                },
                onModeChange: (mode) => {
                    console.log("ElevenLabs: Mode changed to", mode);
                },
            });

            setClient(newClient);
        } catch (error: any) {
            console.error("ElevenLabs: Failed to start session:", error);
            setStatus("error");
            setErrorMsg(error.message || "Nepodarilo sa spustiť hovor");
        }
    }, [agentId]);

    const handleEndCall = useCallback(async () => {
        if (client) {
            await client.endSession();
            setClient(null);
        }
        setStatus("idle");
    }, [client]);

    const label = customLabel || t.demoCall.tryDemo;

    return (
        <div className="flex flex-col items-center w-full">
            {status === "idle" || status === "error" ? (
                <button
                    onClick={handleStartCall}
                    className="btn-primary btn-xl w-full flex items-center justify-center gap-2 relative overflow-hidden group"
                    style={{ background: color, borderColor: color }}
                    title={`Agent ID: ${agentId}`}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                    {icon || <Phone className="w-5 h-5 relative z-10" />}
                    <span className="relative z-10 whitespace-nowrap">{label}</span>
                </button>
            ) : status === "connecting" ? (
                <button
                    disabled
                    className="btn-primary btn-xl w-full flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
                    style={{ background: color, borderColor: color }}
                >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="whitespace-nowrap">{t.demoCall.connecting}</span>
                </button>
            ) : (
                <button
                    onClick={handleEndCall}
                    className={`btn-xl w-full flex items-center justify-center gap-2 rounded-full font-semibold transition-all shadow-lg active:scale-95`}
                    style={{ backgroundColor: "#ef4444", color: "white", padding: "0.875rem 2rem" }}
                >
                    <PhoneOff className="w-5 h-5" />
                    <span className="whitespace-nowrap">{t.demoCall.endCall}</span>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse-glow ml-2" />
                </button>
            )}

            {status === "error" && (
                <p className="text-red-400 text-sm mt-2 text-center max-w-xs">{errorMsg}</p>
            )}
        </div>
    );
}
