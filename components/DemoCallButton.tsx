"use client";

import { useState, useEffect, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useLang } from "@/lib/i18n";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

interface DemoCallButtonProps {
    businessType?: string;
    backendUrl?: string; // Optional custom backend URL (e.g. for Peto's branch)
    customLabel?: string;
    icon?: React.ReactNode;
    color?: string;
}

export default function DemoCallButton({
    businessType = "taxi",
    backendUrl = "https://call-agent-65sb.onrender.com",
    customLabel,
    icon,
    color = "#7B61FF"
}: DemoCallButtonProps) {
    const { t } = useLang();
    const deviceRef = useRef<Device | null>(null);
    const [call, setCall] = useState<Call | null>(null);
    const [status, setStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
    const [userId, setUserId] = useState<string | null>(null);
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

            // Cleanup previous device if exists
            if (deviceRef.current) {
                deviceRef.current.destroy();
                deviceRef.current = null;
            }

            // Use the provided backendUrl to fetch the Twilio token
            const tokenUrl = `${backendUrl.replace(/\/$/, "")}/twilio/token`;
            const response = await fetch(tokenUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch token from ${tokenUrl}`);
            }
            const data = await response.json();
            const token = data.token;
            const identity = data.identity;
            setUserId(identity);

            const newDevice = new Device(token, {
                codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
                edge: ["dublin", "frankfurt"],
            });

            // Nastavenie mikrofónu pre elimináciu ozveny a šumu
            if (newDevice.audio) {
                await newDevice.audio.setAudioConstraints({
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                });
            }

            newDevice.on("error", (error) => {
                console.error("Twilio Device Error:", error);
                // Only show error if we are not idle or if the device wasn't just destroyed
                if (deviceRef.current === newDevice) {
                    setCall((currentCall) => {
                        if (!currentCall || currentCall.status() === "closed") {
                            setStatus("error");
                            setErrorMsg(error.message);
                        }
                        return currentCall;
                    });
                }
            });

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

            // Connect and pass the business_type as a parameter
            const newCall = await newDevice.connect({
                params: {
                    source: "web-demo",
                    business_type: businessType
                },
            });

            newCall.on("accept", () => {
                setStatus("active");
                console.log("Call accepted");
            });

            newCall.on("disconnect", () => {
                console.log("Call disconnected event");
                handleEndCall();
            });

            newCall.on("error", (error) => {
                console.error("Call error:", error);
                setStatus("error");
                setErrorMsg(error.message);
                handleEndCall();
            });

            setCall(newCall);
        } catch (error: any) {
            console.error("Failed to start call:", error);
            setStatus("error");
            setErrorMsg(error.message || "Unknown error occurred");
        }
    };

    const handleEndCall = () => {
        // 1. Frontend SDK Disconnect (WebRTC)
        if (call) {
            try {
                call.disconnect();
            } catch (e) {
                console.error("Error disconnecting call:", e);
            }
            setCall(null);
        }
        
        if (deviceRef.current) {
            try {
                // Destroying the device removes all listeners and stops background errors
                deviceRef.current.destroy();
            } catch (e) {
                console.error("Error destroying device:", e);
            }
            deviceRef.current = null;
        }

        // 2. Server-side Hangup Failsafe (Twilio REST API)
        if (userId) {
            const hangupUrl = `${backendUrl.replace(/\/$/, "")}/twilio/hangup-by-identity`;
            fetch(hangupUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identity: userId })
            }).catch(err => console.error("Hangup failsafe failed:", err));
        }

        setStatus("idle");
        // Clear error message when manually ending a call or returning to idle
        setErrorMsg(""); 
    };

    const label = customLabel || t.demoCall.tryDemo;

    return (
        <div className="flex flex-col items-center w-full">
            {status === "idle" || status === "error" ? (
                <button
                    onClick={handleStartCall}
                    className="btn-primary btn-xl w-full flex items-center justify-center gap-2 relative overflow-hidden group"
                    style={{ background: color, borderColor: color }}
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
                    className="btn-xl w-full flex items-center justify-center gap-2 rounded-full font-semibold transition-all shadow-lg active:scale-95"
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
