import { generateTTS } from './src/lib/ttsService';

async function test() {
    console.log("Testing TTS and Hosting...");
    const url = await generateTTS("Hello this is a test from the AI assistant. Appka swagat hai.", "en");
    console.log("Hosted URL:", url);
    if (url && url.startsWith("http")) {
        console.log("✅ SUCCESS");
    } else {
        console.log("❌ FAILED");
    }
}

test().catch(console.error);
