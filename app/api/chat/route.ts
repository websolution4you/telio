import { GoogleGenerativeAI } from "@google/generative-ai";
import { chatbotKnowledge } from "@/lib/chatbot-knowledge";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.TELIO_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// Supabase Admin Client for logging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^"|"$/g, '');
const supabaseServiceKey = process.env.CORE_SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^"|"$/g, '');

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

/**
 * 1. Simple Language Detection
 */
function detectLanguage(text: string): "sk" | "en" {
  const skChars = /[ľščťžýáíéóúäô]/i;
  const enWords = /\b(the|is|and|you|how|price|cost|where|work|about|who|what|can)\b/i;
  
  if (skChars.test(text)) return "sk";
  if (enWords.test(text)) return "en";
  return "sk"; // Default to Slovak
}

/**
 * 2. Improved Intent Detection (English + Slovak)
 */
function detectIntent(text: string): string {
  const lowerText = text.toLowerCase();
  
  const keywords = {
    overview: ["co je", "ako to funguje", "kto ste", "telio", "what is", "how it works", "how does it work", "who are you", "product", "overview", "what do you do", "what can telio do", "who is it for"],
    pricing: ["cena", "cennik", "kolko", "drahe", "price", "pricing", "cost", "expensive", "starter", "business", "enterprise", "how much", "trial"],
    demo: ["demo", "pizza", "taxi", "ukazka", "vyskusat", "try"],
    languages: ["jazyk", "jazyky", "slovensky", "anglicky", "english", "language", "languages", "speak"],
    dashboard: ["dashboard", "flotila", "fleet", "mapa", "map", "live", "tracking", "heatmap", "eta"],
    contact: ["kontakt", "pristup", "ziskat pristup", "formular", "contact", "get access", "form"]
  };

  for (const [intent, words] of Object.entries(keywords)) {
    if (words.some(word => lowerText.includes(word))) return intent;
  }
  
  return "unknown";
}

/**
 * Helper to get safe fallback response
 */
function getFallbackReply(intent: string, lang: "sk" | "en", source: string) {
  const fallbacks = (chatbotKnowledge as any).intentFallbacks;
  const intentData = fallbacks[intent] || fallbacks.unknown;
  const reply = intentData[lang] || intentData.sk;
  
  return {
    role: "assistant",
    content: reply,
    reply: reply,
    language: lang,
    intent: intent,
    source: source
  };
}

/**
 * Background Logging to Supabase
 */
async function logInteraction(data: {
  sessionId: string;
  pageUrl: string;
  userMessage: string;
  assistantReply: string;
  language: string;
  intent: string;
  source: string;
}) {
  if (!supabaseAdmin) return;
  
  try {
    await supabaseAdmin
      .from("chatbot_logs")
      .insert([{
        session_id: data.sessionId,
        page_url: data.pageUrl,
        user_message: data.userMessage,
        assistant_reply: data.assistantReply,
        language: data.language,
        intent: data.intent,
        source: data.source,
        is_fallback: data.source !== "model"
      }]);
  } catch (err: any) {
    console.error("[ChatLog] Supabase insertion failed:", err.message);
  }
}

export async function POST(req: Request) {
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const userMessage = body.message;
    const sessionId = body.sessionId || "unknown";
    const pageUrl = body.pageUrl || "unknown";
    
    if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
      const fb = getFallbackReply("unknown", "sk", "safety_empty_message");
      return NextResponse.json(fb);
    }

    const lang = detectLanguage(userMessage);
    const intent = detectIntent(userMessage);

    // Development info log
    console.log(`[ChatLog] "${userMessage}" | Lang: ${lang} | Intent: ${intent}`);

    let finalResponse;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      
      const prompt = `
        Identita: Si ${chatbotKnowledge.brand.assistantName}, asistent pre firmu ${chatbotKnowledge.brand.name}.
        Rola: ${chatbotKnowledge.brand.role}.
        Jazyk odpovede: ${lang === "en" ? "ENGLISH" : "SLOVENSKY"}.
        
        Dáta (Knowledge Base):
        ---
        ${JSON.stringify(chatbotKnowledge, null, 2)}
        ---

        Pravidlá odpovedania:
        1. Ak používateľ píše v ANGLIČTINE, odpovedaj VŽDY V ANGLIČTINE.
        2. Môžeš prekladať slovenské časti znalostnej bázy (overview, faq, pricing, dashboard, features) do angličtiny.
        3. Odpovedaj profesionálne, stručne a na základe faktov. Nevymýšľaj si.
        4. Ak je odpoveď v dátach, odpovedaj sebavedomo.
        5. Ak odpoveď úplne chýba, zostaň profesionálny (nepriznávaj technické chyby).

        Otázka od používateľa: ${userMessage}
      `;

      const result = await model.generateContent(prompt);
      const outputText = result.response.text();

      if (!outputText || outputText.trim() === "") {
        finalResponse = getFallbackReply(intent, lang, "intent_fallback_empty_model_reply");
      } else {
        finalResponse = {
          role: "assistant",
          content: outputText,
          reply: outputText,
          language: lang,
          intent: intent,
          source: "model"
        };
      }

    } catch (modelError: any) {
      console.error(`Model Error: ${modelError.message}`);
      finalResponse = getFallbackReply(intent, lang, "intent_fallback_model_error");
    }

    // Fire-and-forget logging to Supabase
    logInteraction({
      sessionId,
      pageUrl,
      userMessage,
      assistantReply: finalResponse.reply,
      language: lang,
      intent: intent,
      source: finalResponse.source as string
    });

    return NextResponse.json(finalResponse);

  } catch (outerError: any) {
    console.error(`Outer API Error: ${outerError.message}`);
    const techFb = getFallbackReply("unknown", "sk", "technical_fallback");
    return NextResponse.json(techFb);
  }
}
