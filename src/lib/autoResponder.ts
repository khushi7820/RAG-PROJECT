import { supabaseAdmin as supabase } from "./supabaseClient";
import { embedText } from "./embeddings";
import { retrieveRelevantChunksFromFiles } from "./retrieval";
import { getFilesForPhoneNumber } from "./phoneMapping";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "./whatsappSender";
import { speechToText } from "./speechToText";
import { generateTTS } from "./ttsService";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export type AutoResponseResult = {
  success: boolean;
  response?: string;
  mediaUrl?: string;
  error?: string;
  noDocuments?: boolean;
  sent?: boolean;
};

/* ---------------- LANGUAGE DETECTION ---------------- */
async function detectLanguage(text: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "Detect if the text is English, Hindi, or Hinglish (Hindi in Roman script). Reply ONLY with the word: English, Hindi, or Hinglish.",
        },
        { role: "user", content: text },
      ],
    });
    const detected = completion.choices[0]?.message?.content?.toLowerCase() || "";
    if (detected.includes("hinglish")) return "hinglish";
    if (detected.includes("hindi")) return "hindi";
    return "english";
  } catch {
    return "english";
  }
}

/* ---------------- FORMAT RESPONSE ---------------- */
function formatWhatsAppResponse(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim().slice(0, 900);
}

/* ---------------- MAIN AUTO RESPONDER ---------------- */
export async function generateAutoResponse(
  fromNumber: string,
  toNumber: string,
  messageText: string | null,
  messageId: string,
  mediaUrl?: string,
  isAudioInput: boolean = false
): Promise<AutoResponseResult> {
  try {
    console.log("🤖 [AUTO RESPONDER] Called with:", { fromNumber, toNumber, hasText: !!messageText, isAudio: isAudioInput });
    
    /* 1️⃣ FILE MAPPING & CONFIG */
    const fileIds = await getFilesForPhoneNumber(toNumber);
    if (fileIds.length === 0) return { success: false, noDocuments: true, error: "No data configured" };

    const { data: mappingRows } = await supabase
      .from("phone_document_mapping")
      .select("system_prompt, auth_token, origin")
      .eq("phone_number", toNumber)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!mappingRows || mappingRows.length === 0) return { success: false, error: "Phone configuration missing" };
    const { system_prompt, auth_token, origin } = mappingRows[0];

    /* 2️⃣ INPUT NORMALIZATION */
    let userText = messageText?.trim() || "";
    if (!userText && mediaUrl) {
      const transcript = await speechToText(mediaUrl);
      if (!transcript?.text) return { success: false, error: "Voice transcription failed" };
      userText = transcript.text.trim();
    }
    if (!userText) return { success: false, error: "Empty message" };
    
    // 🔍 Fix common mishearings (like VANVANZA -> 11ZA)
    userText = userText.replace(/vanvanza/gi, "11ZA");
    
    const language = await detectLanguage(userText);
    console.log(`🌐 [AUTO RESPONDER] Input: ${isAudioInput ? 'Audio' : 'Text'} | Lang: ${language}`);

    /* 3️⃣ CHAT HISTORY & RAG */
    const { data: historyRows } = await supabase
        .from("whatsapp_messages")
        .select("content_text, event_type")
        .or(`and(from_number.eq.${fromNumber},to_number.eq.${toNumber}),and(from_number.eq.${toNumber},to_number.eq.${fromNumber})`)
        .order("received_at", { ascending: true })
        .limit(8);

    const history = (historyRows || []).filter((m) => m.content_text).map((m) => ({
        role: m.event_type === "MoMessage" ? "user" : "assistant",
        content: m.content_text as string,
    }));

    const normalizedText = userText.toLowerCase().replace(/[^\w\s]/g, "");
    const isGreeting = /^(hi|hello|hey|namaste|helo|hye|hii|hiii|yoo)$/i.test(normalizedText);
    const isAck = /^(ok|okay|yes|no|thank|thanks|shukriya|haan|nahi|nah)$/i.test(normalizedText);
    const isSupport = /^(support|help|contact|customer care|number|call|email)$/i.test(normalizedText);
    const isGreetingOrAck = isGreeting || isAck || isSupport;

    let contextText = "";
    if (!isGreetingOrAck) {
      const embedding = await embedText(userText);
      if (embedding) {
        const matches = await retrieveRelevantChunksFromFiles(embedding, fileIds, 8);
        contextText = matches.map((m) => m.chunk).join("\n\n");
      }
    }

    /* 4️⃣ STRICT LANGUAGE MATRIX & SYSTEM PROMPT */
    let targetLanguage = language;
    let langInstruction = "";

    if (isAudioInput) {
        if (language === "hindi" || language === "hinglish") {
            targetLanguage = "hinglish";
            langInstruction = "REPLY IN HINGLISH ONLY (Hindi words written in Roman/English script). Example: 'Aapka plan ₹10,000 se shuru hota hai.' — No Devanagari (हिन्दी), No Gujarati (ગુજરાતી), No other scripts.";
        } else {
            targetLanguage = "english";
            langInstruction = "REPLY IN ENGLISH ONLY. No Hindi, no Gujarati, no other languages.";
        }
    } else {
        if (language === "hindi") {
            langInstruction = "REPLY IN HINDI (Devanagari script) ONLY. No Gujarati, no other languages.";
        } else if (language === "hinglish") {
            langInstruction = "REPLY IN HINGLISH ONLY (Hindi words in Roman script). No Devanagari, no Gujarati.";
        } else {
            targetLanguage = "english";
            langInstruction = "REPLY IN ENGLISH ONLY. No Hindi, no Gujarati, no other languages.";
        }
    }

    const systemPrompt = `
=== ABSOLUTE LANGUAGE RULE — FOLLOW THIS FIRST AND ALWAYS ===
${langInstruction}
The FAQ/context below may be written in Gujarati, Hindi, or another language.
You MUST translate the entire answer into ${targetLanguage.toUpperCase()} before responding.
NEVER output Gujarati script (ગુ), never output any language other than ${targetLanguage.toUpperCase()}.
This rule OVERRIDES everything else.
=============================================================

${system_prompt || "You are a helpful WhatsApp assistant for 11za."}

Rules:
- Give the FULL and COMPLETE answer from the CONTEXT. Do NOT summarize or shorten.
- Be direct and friendly. 😊
- If you cannot find the answer in the context, say: "I don't have that specific information yet. Please contact support at +91 9726654060 or info@11za.com."

CONTEXT:
${contextText ? contextText : (
    isGreeting ? "User is greeting. Reply with a warm welcome to 11ZA and ask how you can help." :
    isSupport ? "User needs support. Provide 11za support contact: +91 9726654060 or info@11za.com." :
    isAck ? "User is acknowledging. Reply politely." :
    "No relevant context found. Politely inform the user and provide support contact: +91 9726654060 or info@11za.com."
)}
`;


    /* 5️⃣ LLM */
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-4),
        { role: "user", content: userText },
        { role: "system", content: `REMINDER: Your response MUST be in ${targetLanguage.toUpperCase()}. Absolutely NO Gujarati script.` }
      ] as any,
    });

    let response = formatWhatsAppResponse(completion.choices[0]?.message?.content || "");
    if (!response) return { success: false, error: "Empty AI response" };

    /* 6️⃣ TTS GENERATION (IF AUDIO INPUT) */
    let responseMediaUrl: string | undefined = undefined;
    if (isAudioInput) {
        const hostedUrl = await generateTTS(response, targetLanguage === "hinglish" ? "hi" : "en");
        if (hostedUrl) {
            responseMediaUrl = hostedUrl;
            console.log("🎙️ [AUTO RESPONDER] Audio hosted at:", responseMediaUrl);
        }
    }

    /* 7️⃣ SEND & SAVE */
    // Send Text First
    const sendText = await sendWhatsAppMessage(fromNumber, response, auth_token!, origin!);
    if (!sendText.success) return { success: false, error: sendText.error };

    // Send Audio Second (if applicable)
    if (isAudioInput && responseMediaUrl) {
        console.log("📤 [AUTO RESPONDER] Sending voice note...");
        await sendWhatsAppMedia(fromNumber, responseMediaUrl, "audio", auth_token!, origin!);
    }

    // Save result to DB
    await supabase.from("whatsapp_messages").insert([{
        message_id: `auto_${messageId}_${Date.now()}`,
        channel: "whatsapp",
        from_number: toNumber,
        to_number: fromNumber,
        received_at: new Date().toISOString(),
        content_text: response,
        sender_name: "AI Assistant",
        event_type: "MtMessage",
        is_in_24_window: true,
    }]);

    return { success: true, response, sent: true, mediaUrl: responseMediaUrl };
  } catch (err) {
    console.error("🔥 [AUTO RESPONDER] EXCEPTION:", err);
    return { success: false, error: String(err) };
  }
}
