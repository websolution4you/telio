"use client";

import { useState, useEffect, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useLang } from "@/lib/i18n";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

export default function DemoCallButton() {
    const { t } = useLang();
    const deviceRef = useRef<Device | null>(null);
    const [call, setCall] = useState<Call | null>(null);
    const [status, setStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        return () => {
            if (deviceRef.current) {
                deviceRef.current.destroy();
            }
        };
    }, []);

    const handleStartCall = async () => {
        try {
            setStatus("connecting");
            setErrorMsg("");

            const response = await fetch("https://call-agent-65sb.onrender.com/twilio/token");
            if (!response.ok) {
                throw new Error("Failed to fetch token");
            }
            const data = await response.json();
            const token = data.token; // adjust if your backend returns { accessToken: ... } or similar

            const newDevice = new Device(token, {
                codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
                edge: ["dublin", "frankfurt"],
            });

            newDevice.on("error", (error) => {
                console.error("Twilio Device Error:", error);
                setStatus("error");
                setErrorMsg(error.message);
            });

            // Rozdelenie register() a connect()
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Registration timeout: nepodarilo sa pripojiť k sieti Twilio."));
                }, 10000);

                newDevice.once("registered", () => {
                    clearTimeout(timeout);
                    console.log("Twilio Voice Device registered");
                    resolve();
                });

                newDevice.register();
            });

            deviceRef.current = newDevice;

            // Zariadenie je teraz plne zaregistrované, môžeme spustiť hovor
            const newCall = await newDevice.connect({
                params: {
                    source: "web-demo",
                },
            });

            newCall.on("accept", () => {
                setStatus("active");
                console.log("Call accepted");
            });

            newCall.on("disconnect", () => {
                setStatus("idle");
                setCall(null);
                console.log("Call disconnected");
            });

            newCall.on("error", (error) => {
                console.error("Call error:", error);
                setStatus("error");
                setErrorMsg(error.message);
                setCall(null);
            });

            setCall(newCall);
        } catch (error: any) {
            console.error("Failed to start call:", error);
            setStatus("error");
            setErrorMsg(error.message || "Unknown error occurred");
        }
    };

    const handleEndCall = () => {
        if (call) {
            call.disconnect();
        } else if (deviceRef.current) {
            deviceRef.current.disconnectAll();
        }
        setStatus("idle");
        setCall(null);
    };

    return (
        <div className="flex flex-col items-center">
            {status === "idle" || status === "error" ? (
                <button
                    onClick={handleStartCall}
                    className="btn-primary btn-xl w-full sm:w-auto flex items-center justify-center gap-2 relative overflow-hidden group"
                    style={{ background: "#7B61FF", borderColor: "#7B61FF" }}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                    <Phone className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">{t.demoCall.tryDemo}</span>
                </button>
            ) : status === "connecting" ? (
                <button
                    disabled
                    className="btn-primary btn-xl w-full sm:w-auto flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
                    style={{ background: "#7B61FF", borderColor: "#7B61FF" }}
                >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.demoCall.connecting}</span>
                </button>
            ) : (
                <button
                    onClick={handleEndCall}
                    className="btn-xl w-full sm:w-auto flex items-center justify-center gap-2 rounded-full font-semibold transition-all shadow-lg active:scale-95"
                    style={{ backgroundColor: "#ef4444", color: "white", padding: "0.875rem 2rem" }}
                >
                    <PhoneOff className="w-5 h-5" />
                    <span>{t.demoCall.endCall}</span>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse-glow ml-2" />
                </button>
            )}

            {status === "error" && (
                <p className="text-red-400 text-sm mt-2 text-center max-w-xs">{errorMsg}</p>
            )}
        </div>
    );
}
