import { GoogleGenerativeAI } from "@google/generative-ai";
import { chatbotKnowledge } from "@/lib/chatbot-knowledge";
import { NextResponse } from "next/server";

const apiKey = process.env.TELIO_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * 1. Simple Language Detection
 */
function detectLanguage(text: string): "sk" | "en" {
  const skChars = /[ľščťžýáíéóúäô]/i;
  const enWords = /\b(the|is|and|you|how|price|cost|where|work|about)\b/i;
  
  if (skChars.test(text)) return "sk";
  if (enWords.test(text)) return "en";
  return "sk"; // Default to Slovak
}

/**
 * 2. Simple Intent Detection
 */
function detectIntent(text: string): string {
  const lowerText = text.toLowerCase();
  
  const keywords = {
    pricing: ["cena", "cennik", "kolko", "drahe", "price", "pricing", "cost", "expensive", "starter", "business", "enterprise"],
    demo: ["demo", "pizza", "taxi", "ukazka", "vyskusat", "try"],
    languages: ["jazyk", "jazyky", "slovensky", "anglicky", "english", "language", "languages"],
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

export async function POST(req: Request) {
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const userMessage = body.message; // Strict format: { message: string }
    
    if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
      return NextResponse.json(getFallbackReply("unknown", "sk", "safety_empty_message"));
    }

    const lang = detectLanguage(userMessage);
    const intent = detectIntent(userMessage);

    // Logging for visibility
    console.log(`[ChatLog] Incoming: "${userMessage}" | Lang: ${lang} | Intent: ${intent}`);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-lite" });
      
      const prompt = `
        Identita: Si ${chatbotKnowledge.brand.assistantName}, asistent pre firmu ${chatbotKnowledge.brand.name}.
        Rola: ${chatbotKnowledge.brand.role}.
        Jazyk odpovede: ${lang === "en" ? "Angličtina (English)" : "Slovenčina"}.
        
        Dáta (Knowledge Base):
        ---
        ${JSON.stringify(chatbotKnowledge, null, 2)}
        ---

        Pravidlá:
        1. Odpovedaj výhradne v jazyku: ${lang === "en" ? "ENGLISH" : "SLOVENSKY"}.
        2. Rešpektuj pravidlá: ${chatbotKnowledge.responseRules.join(" ")}
        3. Pre biznis otázky (cena, faq) použi presné dáta. Pre slovníkové (glossary) vysvetli pojem.
        4. Nikdy nepriznávaj chyby a nehovor "niečo sa pokazilo".

        Položená otázka: ${userMessage}
      `;

      const result = await model.generateContent(prompt);
      const outputText = result.response.text();

      if (!outputText || outputText.trim() === "") {
        console.error("Gemini returned empty reply.");
        return NextResponse.json(getFallbackReply(intent, lang, "intent_fallback_empty_model_reply"));
      }

      return NextResponse.json({
        role: "assistant",
        content: outputText,
        reply: outputText,
        language: lang,
        intent: intent,
        source: "model"
      });

    } catch (modelError: any) {
      console.error(`Model Error: ${modelError.message}`);
      return NextResponse.json(getFallbackReply(intent, lang, "intent_fallback_model_error"));
    }

  } catch (outerError: any) {
    console.error(`Outer API Error: ${outerError.message}`);
    return NextResponse.json(getFallbackReply("unknown", "sk", "technical_fallback"));
  }
}
