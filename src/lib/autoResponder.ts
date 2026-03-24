import { supabase } from "./supabaseClient";
import { embedText } from "./embeddings";
import { retrieveRelevantChunksFromFiles } from "./retrieval";
import { getFilesForPhoneNumber } from "./phoneMapping";
import { sendWhatsAppMessage } from "./whatsappSender";
import { speechToText } from "./speechToText";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export type AutoResponseResult = {
  success: boolean;
  response?: string;
  error?: string;
  noDocuments?: boolean;
  sent?: boolean;
};

/* ---------------- LANGUAGE DETECTION ---------------- */
async function detectLanguage(text: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Detect the language. Reply ONLY with language name like English, Hindi, Gujarati.",
        },
        { role: "user", content: text },
      ],
    });

    return completion.choices[0]?.message?.content?.toLowerCase() || "english";
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
  mediaUrl?: string
): Promise<AutoResponseResult> {
  try {
    console.log("🤖 [AUTO RESPONDER] Called with:", { fromNumber, toNumber, hasText: !!messageText, hasMedia: !!mediaUrl });
    
    /* 1️⃣ FILE MAPPING */
    const fileIds = await getFilesForPhoneNumber(toNumber);
    console.log("📁 Files found:", fileIds.length);

    if (fileIds.length === 0) {
      console.error("❌ [AUTO RESPONDER] No files configured for", toNumber);
      return {
        success: false,
        noDocuments: true,
        error: "No data configured",
      };
    }

    /* 2️⃣ PHONE CONFIG */
    const { data: phoneMappings } = await supabase
      .from("phone_document_mapping")
      .select("system_prompt, auth_token, origin")
      .eq("phone_number", toNumber)
      .limit(1);

    if (!phoneMappings?.length) {
      return { success: false, error: "Phone configuration missing" };
    }

    const { system_prompt, auth_token, origin } = phoneMappings[0];

    if (!auth_token || !origin) {
      return { success: false, error: "WhatsApp credentials missing" };
    }

    /* 3️⃣ INPUT NORMALIZATION */
    let userText = messageText?.trim() || "";
    let language = "english";

    if (!userText && mediaUrl) {
      console.log("🎙️ [AUTO RESPONDER] Processing audio from mediaUrl:", mediaUrl);
      const transcript = await speechToText(mediaUrl);
      if (!transcript?.text) {
        console.error("❌ [AUTO RESPONDER] Voice transcription failed for:", mediaUrl);
        return { success: false, error: "Voice transcription failed" };
      }
      userText = transcript.text.trim();
      console.log("📝 [AUTO RESPONDER] Audio transcribed to:", userText);
    }

    if (userText) {
      language = await detectLanguage(userText);
      console.log("🌐 [AUTO RESPONDER] Detected language:", language);
    }

    if (!userText) {
      console.warn("⚠️ [AUTO RESPONDER] No text to respond to.");
      return { success: false, error: "Empty message" };
    }

    /* 4️⃣ CHAT HISTORY */
    const { data: historyRows } = await supabase
      .from("whatsapp_messages")
      .select("content_text, event_type")
      .or(`from_number.eq.${fromNumber},to_number.eq.${fromNumber}`)
      .order("received_at", { ascending: true })
      .limit(10); // Reduced history a bit to save tokens

    const history: { role: "user" | "assistant"; content: string }[] = (
      historyRows || []
    )
      .filter((m) => m.content_text)
      .map((m) => ({
        role: m.event_type === "MoMessage" ? "user" : "assistant",
        content: m.content_text as string,
      }));

    /* 5️⃣ RAG */
    const normalizedText = userText.trim().toLowerCase().replace(/[^\w\s]/g, "");
    const isGreetingOrAck = /^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hola|hey there|howdy|ok|okk|okay|achha|acha|oh|ohk|cool|nice|great|hmm|yes|no|haa|ha|na|how are you|how r u|kaise ho|kya hal hai)$/i.test(normalizedText);

    let contextText = "";
    if (!isGreetingOrAck) {
      const embedding = await embedText(userText);
      if (embedding) {
        const matches = await retrieveRelevantChunksFromFiles(
          embedding,
          fileIds,
          2 // Even fewer chunks for speed and stability
        );
        contextText = matches.map((m) => m.chunk).join("\n\n");
      }
    }

    /* 6️⃣ SYSTEM PROMPT */
    const systemPrompt = `
${system_prompt || "You are a helpful WhatsApp assistant."}

### MANDATORY RULES:
1. **REPLY IN ${language.toUpperCase()}**: The user is speaking in ${language.toUpperCase()}. You MUST reply ONLY in ${language.toUpperCase()}. No Hinglish if they ask in pure English. No English if they ask in pure Hindi. Mirror their style perfectly.
2. **STAY CONCISE**: 1-2 short sentences maximum.
3. **ONLY USE CONTEXT**: If the answer isn't in the context below, say "Iske liye mere paas abhi sahi jankari nahi hai." in the user's language.

CONTEXT:
${contextText ? contextText : (isGreetingOrAck ? "[User is greeting. Reply politely in their language.]" : "[No data found. Decline politely.]")}
`;

    /* 7️⃣ LLM */
    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4),
      { role: "user", content: userText },
    ];

    console.log("🤖 [AUTO RESPONDER] Calling Groq API...");
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 500,
      messages: messagesPayload as any,
    });
    console.log("✅ [AUTO RESPONDER] Groq API response received");

    let response = completion.choices[0]?.message?.content;
    if (!response) {
      console.error("❌ [AUTO RESPONDER] Empty AI response from Groq");
      return { success: false, error: "Empty AI response" };
    }

    response = formatWhatsAppResponse(response);
    console.log("📤 [AUTO RESPONDER] Will send:", response.substring(0, 50) + "...");

    /* 8️⃣ SEND WHATSAPP */
    const send = await sendWhatsAppMessage(
      fromNumber,
      response,
      auth_token,
      origin
    );

    if (!send.success) {
      console.error("❌ [AUTO RESPONDER] Failed to send WhatsApp message:", send.error);
      return { success: false, error: send.error };
    }
    console.log("✅ [AUTO RESPONDER] Message sent successfully");

    /* 9️⃣ SAVE RESPONSE */
    await supabase.from("whatsapp_messages").insert([
      {
        message_id: `auto_${messageId}_${Date.now()}`,
        channel: "whatsapp",
        from_number: toNumber,
        to_number: fromNumber,
        received_at: new Date().toISOString(),
        content_type: "text",
        content_text: response,
        sender_name: "AI Assistant",
        event_type: "MtMessage",
        is_in_24_window: true,
      },
    ]);

    return { success: true, response, sent: true };
  } catch (err) {
    console.error("🔥 [AUTO RESPONDER] EXCEPTION:", err instanceof Error ? err.message : err);
    if (err instanceof Error) console.error("Stack:", err.stack);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
