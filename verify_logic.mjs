import { generateAutoResponse } from './src/lib/autoResponder';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
    console.log("🔍 VERIFYING STRICT LANGUAGE & AUDIO LOGIC...");

    const testCases = [
        { name: "Hindi Audio", isAudio: true, text: "Mujhe support ke baare me bataiye", lang: "hindi" },
        { name: "Hindi Text", isAudio: false, text: "नमस्ते", lang: "hindi" }
    ];

    for (const test of testCases) {
        console.log(`\n--- ${test.name} ---`);
        const res = await generateAutoResponse(
            "917820870519", 
            "15558903791", 
            test.text, 
            "verify_" + Date.now(), 
            test.isAudio ? "https://engees11zamedia.11za.in/prateektosniwalpvt/Receive/AUD/AUD-22104663569274519.ogg" : undefined, 
            test.isAudio
        );
        console.log("Result:", JSON.stringify(res, null, 2));
    }
}

verify().catch(console.error);
