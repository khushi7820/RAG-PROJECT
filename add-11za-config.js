const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function addConfig() {
    console.log('🚀 Adding 11za configuration...');
    
    const authToken = 'U2FsdGVkX18USEdKGqdBqfArnTJo0BSaD6ISoIzple4dPvYIEhwF7gymW5N4N9m3fBvxa9+HBPUP4cWNyIydkCOpj9xknE8g2TSnEyehqifiAwvYYJQVXdRlqzRPO4nHM208QkZRb4HkJR0SSEtd/wsRAPrc40YXjfCNCDE3cwMbpMCF3GXpA0FnQQwNYH4+';
    const origin = 'https://app.11za.in/apis/template/sendTemplate';
    const phoneNumber = '15558903791';

    try {
        // Check if already exists
        const { data: existing, error: checkError } = await supabase
            .from('phone_document_mapping')
            .select('*')
            .eq('phone_number', phoneNumber);

        if (checkError) {
            console.error('❌ Error checking existing:', checkError);
            return;
        }

        if (existing && existing.length > 0) {
            console.log('✏️ Updating existing record for', phoneNumber);
            const { error: updateError } = await supabase
                .from('phone_document_mapping')
                .update({
                    auth_token: authToken,
                    origin: origin,
                    system_prompt: systemPrompt,
                })
                .eq('phone_number', phoneNumber);

            if (updateError) {
                console.error('❌ Update error:', updateError);
                return;
            }
            console.log('✅ Updated successfully!');
        } else {
            console.log('➕ Creating new record for', phoneNumber);
            const { error: insertError } = await supabase
                .from('phone_document_mapping')
                .insert({
                    phone_number: phoneNumber,
                    auth_token: authToken,
                    origin: origin,
                    system_prompt: systemPrompt,
                    file_id: null,
                });

            if (insertError) {
                console.error('❌ Insert error:', insertError);
                return;
            }
            console.log('✅ Created successfully!');
        }

        console.log(`
✅ 11za Configuration Complete!

📱 Phone Number: ${phoneNumber}
🔐 Auth Token: ***configured***
🌐 Origin: ${origin}
📝 System Prompt: ***generated***

Now your 11za WhatsApp bot is ready!
        `);

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

addConfig();
