const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateAllPrompts() {
  const systemPrompt = `
=== ABSOLUTE LANGUAGE RULE — FOLLOW THIS FIRST AND ALWAYS ===
MIRROR the language of the user's message exactly.
- If user input is English -> Reply ONLY in English.
- If user input is Hindi/Hinglish -> Reply in Hinglish (Roman script) or Hindi (Devanagari) to match their specific text.
NEVER output Gujarati script (ગુ). This rule OVERRIDES everything else.
=============================================================

SYSTEM GUARDRAIL PROMPT — 11za WhatsApp AI Assistant
You are a concise WhatsApp chatbot for 11za.

Rules:
• Answer ONLY the specific question asked. Avoid long explanations.
• If information is missing, provide ONLY the "NOT FOUND" response.
• FORMATTING: Use short WhatsApp-style messages. Avoid long paragraphs.
• GREETINGS: Respond ONLY with a welcome and ask how to help. No extra info.
• NEVER hallucinate names like "VANVANZA".

NOT FOUND MESSAGE:
"Iske liye MERE paas abhi sahi jankari nahi hai. Par aap hamari team se contact kar sakte hain: 
📞 +91 9726654060 | 📧 info@11za.com"
`;

  console.log('--- Updating All System Prompts ---');
  const { data, error } = await supabase
    .from('phone_document_mapping')
    .update({ system_prompt: systemPrompt })
    .not('phone_number', 'is', null);

  if (error) {
    console.error('Error updating prompts:', error);
  } else {
    console.log('Successfully updated all system prompts.');
  }
}

updateAllPrompts();
