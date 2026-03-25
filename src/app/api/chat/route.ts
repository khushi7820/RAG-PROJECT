import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabaseClient";
import { embedText } from "@/lib/embeddings";
import { retrieveRelevantChunks } from "@/lib/retrieval";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function GET() {
  return NextResponse.json({ message: "Chat API is working! Use POST to send messages." });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ only needed fields
    const { message, phone_number } = body;

    if (!message || !phone_number) {
      return NextResponse.json(
        { error: "message and phone_number are required" },
        { status: 400 }
      );
    }

    // ✅ system prompt fetch
    const { data: mappings } = await supabase
      .from("phone_document_mapping")
      .select("system_prompt, file_id")
      .eq("phone_number", phone_number)
      .order("created_at", { ascending: false })
      .limit(1);

    const mapping = mappings?.[0];

    const systemPrompt = mapping?.system_prompt || "You are a helpful assistant";
    const file_id = mapping?.file_id;

    // ✅ embed
    const queryEmbedding = await embedText(message);
    if (!queryEmbedding) {
        return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
    }

    // ✅ Retrieve relevant chunks (filtered by file_id if available)
    const matches = await retrieveRelevantChunks(queryEmbedding, file_id || "", 5);
    const contextText = matches.map((m) => m.chunk).join("\n\n");

    const systemPromptMessage = `
=== ABSOLUTE LANGUAGE RULE — FOLLOW THIS FIRST AND ALWAYS ===
MIRROR the language of the user's message exactly.
- If user input is English -> Reply ONLY in English.
- If user input is Hindi/Hinglish -> Reply in Hinglish (Roman script) or Hindi (Devanagari) to match their specific text.
NEVER output Gujarati script (ગુ) if the user is writing in English or Hindi.
=============================================================

${systemPrompt}

CONTEXT:
${contextText || "No document context found for this query."}
`;

    // ✅ FINAL messages
    const messages: any = [
      {
        role: "system",
        content: systemPromptMessage
      },
      {
        role: "user",
        content: message
      },
      {
        role: "system",
        content: "MIRROR the user's current message language EXACTLY. Reply ONLY in English, Hindi, or Hinglish as appropriate. POSITIVELY NO GUJARATI SCRIPT."
      }
    ];

    // ✅ Groq call
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
      stream: true
    });

    // streaming
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
            controller.close();
        } catch (err) {
            controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });

  } catch (err: any) {
    console.error("CHAT_ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Error" },
      { status: 500 }
    );
  }
}