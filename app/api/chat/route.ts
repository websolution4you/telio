import { GoogleGenerativeAI } from "@google/generative-ai";
import { TELIO_KNOWLEDGE } from "@/lib/chatbot-knowledge";
import { NextResponse } from "next/server";

const apiKey = process.env.TELIO_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: Request) {
  if (!apiKey || apiKey === "your_key_here") {
    console.error("TELIO_GEMINI_API_KEY is missing or is still the placeholder.");
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    console.log("Chat API: Attempting to generate content. Key length:", apiKey?.length);

    try {
      // Pouzivame novy model, kedze Google API kluc v roku 2026 nepodporuje 1.5 verzie
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        Si Telio asistent, virtuálny pomocník pre firmu Telio.
        Tvojou úlohou je stručne a profesionálne odpovedať na otázky v slovenskom jazyku.
        Používaj VÝHRADNE informácie z tohto zdroja:
        ---
        ${TELIO_KNOWLEDGE}
        ---
        
        Pravidlá:
        1. Odpovedaj stručne (max 2-3 vety, ak to nie je zložitejšia otázka).
        2. Ak informáciu v zdroji NENÁJDEŠ, odpovedz presne takto: 
           "Toto momentálne neviem potvrdiť. Najlepšie bude, ak nám necháte kontakt a pripravíme presnú odpoveď."
        3. Nevymýšľaj si žiadne fakty, ceny ani funkcie, ktoré nie sú v zdroji.
        4. Buď milý a profesionálny.

        Otázka od používateľa: ${lastMessage}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return NextResponse.json({ role: "assistant", content: response.text() });
    } catch (error: any) {
      console.error("Primary model failed, trying fallback to gemini-2.5-pro:", error);
      const modelPro = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
      const resultPro = await modelPro.generateContent(lastMessage);
      const responsePro = await resultPro.response;
      return NextResponse.json({ role: "assistant", content: responsePro.text() });
    }
  } catch (outerError: any) {
    console.error("Chat API outer error:", outerError);
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}
