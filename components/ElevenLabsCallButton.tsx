"use client";

import Script from "next/script";

// TypeScript declaration for the custom element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            "elevenlabs-convai": React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & { "agent-id"?: string },
                HTMLElement
            >;
        }
    }
}

interface ElevenLabsCallButtonProps {
    agentId: string;
    customLabel?: string;
    icon?: React.ReactNode;
    color?: string;
}

// We use the official ElevenLabs widget embed instead of the SDK.
// This renders the official floating widget that handles WebSocket connection internally.
export default function ElevenLabsCallButton({ agentId }: ElevenLabsCallButtonProps) {
    return (
        <>
            <Script
                src="https://unpkg.com/@elevenlabs/convai-widget-embed"
                strategy="lazyOnload"
            />
            <elevenlabs-convai agent-id={agentId} />
        </>
    );
}
