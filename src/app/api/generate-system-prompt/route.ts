import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabaseClient";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { intent, phone_number } = body;

        if (!intent || !phone_number) {
            return NextResponse.json(
                { error: "Intent and phone_number are required" },
                { status: 400 }
            );
        }

        console.log("Generating system prompt for intent:", intent);

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 500,
            messages: [
                {
                    role: "system",
                    content: `
You are a senior Conversational AI prompt engineer.

Your task is to generate a SYSTEM PROMPT for a WhatsApp chatbot representing the brand 11za.

11za is a SaaS platform built on the Official WhatsApp Business API that helps businesses automate conversations, manage chats, send broadcast campaigns, and improve customer engagement through WhatsApp.

The generated system prompt must include the following guardrails:

1. Language Mirroring
The chatbot must reply in the same language as the user (Hindi, English, Hinglish).

2. Human Conversation
Responses must be friendly, natural, and WhatsApp-style.
Keep replies short.

3. Greeting Handling
If a user sends "hi", "hello", or "hey", greet them and ask how you can help with 11za.

4. Brand Representation
Explain that 11za helps businesses automate communication using WhatsApp.

5. Feature Awareness
Mention that 11za supports:
- WhatsApp Business API
- chat automation
- broadcast messaging
- chat management
- integrations
- analytics

6. Knowledge Boundary
Never mention internal sources like:
documents, datasets, knowledge base, training data.

7. Response Length
Responses should be short (2–4 lines).

8. Fallback Rule
If the information is not available, politely say so and offer help with another question.

Generate ONLY the system prompt text.
Do not add explanation.
Keep it under 250 words.
          `.trim(),
                },
                {
                    role: "user",
                    content: `
Create a system prompt for a WhatsApp chatbot with this intent:

"${intent}"
          `.trim(),
                },
            ],
        });

        const systemPrompt =
            completion.choices?.[0]?.message?.content?.trim();

        if (!systemPrompt) {
            throw new Error("Failed to generate system prompt");
        }

        console.log("Generated system prompt:", systemPrompt);

        // Check if phone number already exists
        const { data: existingMappings, error: selectError } = await supabase
            .from("phone_document_mapping")
            .select("*")
            .eq("phone_number", phone_number);

        if (selectError) throw selectError;

        if (existingMappings && existingMappings.length > 0) {
            const { error: updateError } = await supabase
                .from("phone_document_mapping")
                .update({
                    intent,
                    system_prompt: systemPrompt,
                })
                .eq("phone_number", phone_number);

            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await supabase
                .from("phone_document_mapping")
                .insert({
                    phone_number,
                    intent,
                    system_prompt: systemPrompt,
                    file_id: null,
                });

            if (insertError) throw insertError;
        }

        return NextResponse.json({
            success: true,
            system_prompt: systemPrompt,
            intent,
        });
    } catch (error) {
        console.error("System prompt generation error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate system prompt",
            },
            { status: 500 }
        );
    }
}