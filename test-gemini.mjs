import { GoogleGenerativeAI } from "@google/generative-ai";

async function test() {
  const apiKey = "AIzaSyBuwR9GEoQFiqdC1-orKJOqoOdeT9gp_q4".trim();
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
        console.error("List Models Failed:", response.status, await response.text());
        return;
    }
    const data = await response.json();
    console.log("Available models:", data.models?.map(m => m.name).join(", "));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
