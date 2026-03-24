const Groq = require('groq-sdk');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

async function detectLanguage(text) {
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
  } catch (err) {
    console.error('Lang detect error:', err);
    return "english";
  }
}

async function testResponse(userText) {
    const language = await detectLanguage(userText);
    const isGreetingOrAck = /^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hola|hey there|howdy|ok|okk|okay|achha|acha|oh|ohk|cool|nice|great|hmm|yes|no|haa|ha|na)$/i.test(userText.trim().replace(/[^\w\s]/g,""));
    
    const system_prompt = "You are a helpful WhatsApp assistant for 11za.";
    const systemPrompt = `
${system_prompt}

CRITICAL INSTRUCTIONS:
1. STRICT LANGUAGE BINDING (MANDATORY): You MUST reply entirely in ${language.toUpperCase()} because the user is answering in ${language.toUpperCase()}. IGNORE the language of past messages. If the user speaks English, your answer MUST be English.
2. TRANSLATE CONTEXT: If the CONTEXT provided below is in Hindi or Hinglish, YOU MUST TRANSLATE IT to ${language.toUpperCase()} before replying to the user. Do NOT copy the context exactly if it doesn't match the user's language.
3. DIRECT ANSWERS ONLY: Answer exactly what the user asks without adding extra fluff. If they say they don't want to talk about a feature, APOLOGIZE BRIEFLY and STOP. Never force a topic.
4. NO FEATURE SPAM: Do NOT bring up features (like Multi-Agent System) unless explicitly asked in the latest message.
5. GREETINGS/ACKS: If the user says "hi", "okk", "yes", "tell me more", etc., answer them directly without feature dumping unless it answers their specific question.
6. KNOWLEDGE BOUNDARY (STRICT): If the user asks a specific question and the answer is NOT present in the CONTEXT below, you MUST politely state that you do not have that information and ask if they have any other questions about 11za. NEVER use your internal knowledge to answer beyond what is in the CONTEXT. This rule does NOT apply to simple greetings (hi, hello, etc.) or positive acknowledgments (ok, yes).
7. STYLE: Keep replies to 1-2 short sentences, friendly, human-like (WhatsApp-style). Use light emojis 😊.

CONTEXT:
${isGreetingOrAck ? "[User is greeting you. Respond warmly and ask how you can help with 11za.]" : "[CRITICAL: No relevant information found in knowledge base. Politely decline the request.]"}
`;

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 500,
      messages: messagesPayload,
    });

    console.log(`\nInput: "${userText}"`);
    console.log(`Is Greeting Or Ack: ${isGreetingOrAck}`);
    console.log(`AI Response: ${completion.choices[0]?.message?.content}`);
}

async function runTests() {
    await testResponse("hey");
    await testResponse("how to bake a cake");
}

runTests();
