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
      model: "llama-3.3-70b-versatile",
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
    /* 1️⃣ FILE MAPPING */
    const fileIds = await getFilesForPhoneNumber(toNumber);

    if (fileIds.length === 0) {
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
      const transcript = await speechToText(mediaUrl);
      if (!transcript?.text) {
        return { success: false, error: "Voice transcription failed" };
      }
      userText = transcript.text.trim();
    }

    if (userText) {
      language = await detectLanguage(userText);
    }

    if (!userText) {
      return { success: false, error: "Empty message" };
    }

    /* 4️⃣ CHAT HISTORY */
    const { data: historyRows } = await supabase
      .from("whatsapp_messages")
      .select("content_text, event_type")
      .or(`from_number.eq.${fromNumber},to_number.eq.${fromNumber}`)
      .order("received_at", { ascending: true })
      .limit(20);

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
          3 // Reduced the context chunks from 5 to 3 to keep it focused
        );
        contextText = matches.map((m) => m.chunk).join("\n\n");
      }
    }

    /* 6️⃣ SYSTEM PROMPT */
    const systemPrompt = `
${system_prompt || "You are a helpful WhatsApp assistant."}

CRITICAL INSTRUCTIONS:
1. STRICT LANGUAGE BINDING (MANDATORY): You MUST reply entirely in ${language.toUpperCase()} because the user is answering in ${language.toUpperCase()}. IGNORE the language of past messages. If the user speaks English, your answer MUST be English.
2. TRANSLATE CONTEXT: If the CONTEXT provided below is in Hindi or Hinglish, YOU MUST TRANSLATE IT to ${language.toUpperCase()} before replying to the user. Do NOT copy the context exactly if it doesn't match the user's language.
3. DIRECT ANSWERS ONLY: Answer exactly what the user asks without adding extra fluff. If they say they don't want to talk about a feature, APOLOGIZE BRIEFLY and STOP. Never force a topic.
4. NO FEATURE SPAM: Do NOT bring up features (like Multi-Agent System) unless explicitly asked in the latest message.
5. GREETINGS/ACKS: If the user says "hi", "okk", "yes", "tell me more", etc., answer them directly without feature dumping unless it answers their specific question.
6. KNOWLEDGE BOUNDARY (STRICT): If the user asks a specific question and the answer is NOT present in the CONTEXT below, you MUST politely state that you do not have that information and ask if they have any other questions about 11za. NEVER use your internal knowledge to answer beyond what is in the CONTEXT. This rule does NOT apply to simple greetings (hi, hello, etc.) or positive acknowledgments (ok, yes).
7. STYLE: Keep replies to 1-2 short sentences, friendly, human-like (WhatsApp-style). Use light emojis 😊.

CONTEXT:
${contextText ? contextText : (isGreetingOrAck ? "[User is greeting you. Respond warmly and ask how you can help with 11za.]" : "[CRITICAL: No relevant information found in knowledge base. Politely decline the request.]")}
`;

    /* 7️⃣ LLM */
    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4),
      { role: "user", content: userText },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 500,
      messages: messagesPayload as any,
    });

    let response = completion.choices[0]?.message?.content;
    if (!response) {
      return { success: false, error: "Empty AI response" };
    }

    response = formatWhatsAppResponse(response);

    /* 8️⃣ SEND WHATSAPP */
    const send = await sendWhatsAppMessage(
      fromNumber,
      response,
      auth_token,
      origin
    );

    if (!send.success) {
      return { success: false, error: send.error };
    }

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
    console.error("AUTO RESPONDER ERROR:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
