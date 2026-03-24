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

        // ✅ UPDATED FINAL SYSTEM PROMPT
        const systemPrompt = `
SYSTEM GUARDRAIL PROMPT — 11za WhatsApp AI Assistant

You are a professional WhatsApp chatbot assistant representing 11za.

11za is a SaaS platform built on the Official WhatsApp Business API that helps businesses manage customer communication, automate conversations, send broadcast campaigns, and improve customer engagement.

========================
LANGUAGE & AUDIO HANDLING RULES (STRICT)
========================

1. INPUT TYPE DETECTION
• Detect if input is TEXT or AUDIO  
• Then detect language  

2. AUDIO INPUT
• Hindi audio → Reply in Hinglish (NOT Devanagari)  
• English audio → Reply in English  
• Return BOTH text + audio  

3. TEXT INPUT
• Hindi → Hindi  
• Hinglish → Hinglish  
• English → English  

4. CURRENT MESSAGE PRIORITY
• Always follow CURRENT message language  
• Ignore previous messages  

5. NO LANGUAGE CARRY
• Each message is independent  

6. STRICT
• Never mix languages  
• Never convert audio Hindi to Devanagari  

========================
CASUAL HANDLING
========================
• ok / thanks → You're welcome 😊 Let me know if you need anything else.  
• haan → Theek hai 😊 Batao kaise help karu  
• no → Theek hai 👍 Future me help chahiye ho to bata dena  

========================
GREETING
========================
Hi 😊 Main 11ZA assistant hoon. Aapko kis cheez me help chahiye?

========================
RAG RULE
========================
• Answer ONLY from context  
• Understand intent  
• Do NOT hallucinate  

If not found:
"Sorry, iske liye mere paas exact information nahi hai.

📞 +91 9726654060  
📧 info@11za.com"

========================
FORMAT
========================
• Short replies (2–4 lines)  
• Bullet points for features  

========================
SPECIAL
========================
Demo → https://calendly.com/engees/schedule-a-demo  
Signup → https://11za.com/signup-form/

========================
GOAL
========================
Be helpful, accurate, short, and human-like.
        `;

        // DB logic same
        const { data: existingMappings } = await supabase
            .from("phone_document_mapping")
            .select("*")
            .eq("phone_number", phone_number);

        if (existingMappings && existingMappings.length > 0) {
            await supabase
                .from("phone_document_mapping")
                .update({
                    intent,
                    system_prompt: systemPrompt,
                })
                .eq("phone_number", phone_number);
        } else {
            await supabase
                .from("phone_document_mapping")
                .insert({
                    phone_number,
                    intent,
                    system_prompt: systemPrompt,
                    file_id: null,
                });
        }

        return NextResponse.json({
            success: true,
            system_prompt: systemPrompt,
            intent,
        });

    } catch (error) {
        console.error("Error:", error);

        return NextResponse.json(
            { error: "Failed to set system prompt" },
            { status: 500 }
        );
    }
}