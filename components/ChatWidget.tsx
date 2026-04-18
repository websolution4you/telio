"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  source?: string;
}

const playSubtleDing = () => {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    ctx.resume().then(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    });
  } catch (e) {
    console.error("Audio error:", e);
  }
};

const SUGGESTED_QUESTIONS = [
  "Čo je Telio?",
  "Koľko to stojí?",
  "Čo je Taxi Demo?",
  "Pre koho je Telio vhodné?",
];

const INTENT_CTA_MAP: Record<string, { label: string; href: string }> = {
  cena:      { label: "Zobraziť cenník",  href: "/#pricing" },
  demo:      { label: "Chcem ukážku",     href: "/#waitlist" },
  kontakt:   { label: "Vyplniť formulár", href: "/#waitlist" },
  dashboard: { label: "Otvoriť dashboard", href: "/dashboard" },
  nezname:   { label: "Kontaktovať nás",  href: "/#waitlist" },
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Dobrý deň, som Telio AI asistent. Môžem vám rýchlo vysvetliť, ako Telio funguje, koľko stojí alebo pre aké prevádzky je vhodné." 
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Session ID
  useEffect(() => {
    let sId = localStorage.getItem("telio_chat_session_id");
    if (!sId) {
      sId = crypto.randomUUID();
      localStorage.setItem("telio_chat_session_id", sId);
    }
    setSessionId(sId);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Initial attention grab
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShouldShake(true);
        playSubtleDing();
        setTimeout(() => setShouldShake(false), 1000);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Periodic reminder
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 1000);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToLastMessageStart = () => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        // Scroll to the top of the new assistant message so user can read from start
        setTimeout(scrollToLastMessageStart, 100);
      } else {
        // For user messages, just scroll to bottom
        scrollToBottom();
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [messages, isOpen]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    const isEn = /^(hi|hello|how|what|price|do you)/i.test(textToSend);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: textToSend,
          sessionId: sessionId,
          pageUrl: window.location.href
        }),
      });

      if (!response.ok) throw new Error("API Error");

      const data = await response.json();
      
      const replyContent = data.reply || (isEn 
        ? "I can’t give you a reliable answer to that right now. Please try rephrasing your question."
        : "Momentálne vám na toto neviem dať spoľahlivú odpoveď. Skúste prosím otázku trochu spresniť.");

      if (isOpen) playSubtleDing();
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: replyContent,
        intent: data.intent,
        source: data.source
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = isEn
        ? "I couldn’t prepare a reliable answer right now. Please try again."
        : "Momentálne sa mi nepodarilo pripraviť odpoveď. Skúste to prosím ešte raz.";
      
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCTAClick = (href: string) => {
    const [path, anchor] = href.split('#');
    const isCurrentPage = !path || path === '/' && window.location.pathname === '/';
    if (anchor && isCurrentPage) {
      const element = document.getElementById(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.location.href = href;
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: shouldShake ? [1, 1.8, 1, 1.4, 1] : 1, 
          opacity: 1,
          x: shouldShake ? [0, -15, 15, -15, 15, 0] : 0,
          rotate: shouldShake ? [0, -15, 15, -15, 15, 0] : 0
        }}
        transition={{
          scale: { duration: 0.8, ease: "easeOut" },
          x: { duration: 0.6, ease: "easeInOut" },
          rotate: { duration: 0.6, ease: "easeInOut" }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-6 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-colors focus:outline-none"
        aria-label="Otvoriť chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={40} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={40} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed z-50 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl top-4 bottom-28 left-4 right-4 sm:top-auto sm:w-[380px] sm:h-[550px] sm:bottom-28 sm:right-6 sm:left-auto"
          >
            {/* Header */}
            <div className="chat-header bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center justify-between p-4 px-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Telio AI Asistent</h3>
                  <p className="text-[11px] opacity-80">Online 24/7</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="sm:hidden p-2 text-white/80 hover:text-white" aria-label="Zatvoriť chat">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-[5px] py-4 space-y-4 bg-zinc-50 dark:bg-zinc-950/50">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  ref={idx === messages.length - 1 ? lastMessageRef : null} 
                  className="flex flex-col gap-2"
                >
                  <motion.div initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} className={`chat-message-wrapper flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`chat-bubble max-w-[85%] rounded-2xl text-sm ${
                        msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none shadow-md" : "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700 rounded-tl-none"
                      }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                  
                  {/* Intent-based CTA Button */}
                  {msg.role === "assistant" && msg.intent && INTENT_CTA_MAP[msg.intent] && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="chat-cta-wrapper flex justify-start ml-2">
                      <button
                        onClick={() => handleCTAClick(INTENT_CTA_MAP[msg.intent!].href)}
                        className="flex items-center gap-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 transition-colors"
                      >
                        {INTENT_CTA_MAP[msg.intent].label}
                        <ArrowRight size={12} />
                      </button>
                    </motion.div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center gap-2 ml-2">
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                    <span className="text-xs text-zinc-500">
                      {/^(hi|hello|how|what|price|do you)/i.test(inputValue) ? "Telio is preparing an answer..." : "Telio pripravuje odpoveď..."}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Suggested Questions */}
              {!isLoading && messages.length <= 2 && (
                <div className="chat-suggestions-container flex flex-wrap gap-2 pt-2">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="chat-suggestion-btn text-[11px] bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 transition-colors shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-2 flex-shrink-0" />
            </div>

            {/* Input Area */}
            <div className="chat-input-container bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 p-2">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="chat-input-wrapper flex gap-2 items-end bg-zinc-100 dark:bg-zinc-800 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700"
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  enterKeyHint="send"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Napíšte otázku..."
                  className="chat-textarea flex-1 bg-transparent border-none px-3 py-2 text-sm focus:ring-0 outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="chat-send-btn p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
                >
                  <Send size={18} className="chat-send-icon" />
                </button>
              </form>
              <p className="text-[10px] text-center text-zinc-400 mt-2">
                Powered by Telio AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
