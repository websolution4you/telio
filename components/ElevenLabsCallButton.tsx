"use client";

import React from "react";
import Script from "next/script";

interface ElevenLabsCallButtonProps {
    agentId: string;
    customLabel?: string;
    icon?: React.ReactNode;
    color?: string;
}

export default function ElevenLabsCallButton({ agentId }: ElevenLabsCallButtonProps) {
    return (
        <>
            <Script
                src="https://unpkg.com/@elevenlabs/convai-widget-embed"
                strategy="lazyOnload"
            />
            {React.createElement("elevenlabs-convai", { "agent-id": agentId })}
        </>
    );
}
