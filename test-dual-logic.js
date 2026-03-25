const { generateAutoResponse } = require('./src/lib/autoResponder');

async function runTests() {
    console.log("🚀 STARTING DUAL-MESSAGE & LANGUAGE TESTS\n");

    const tests = [
        { name: "Hindi Audio -> Hinglish Text + Voice", isAudio: true, text: "Mujhe privacy policy ke baare me batao", lang: "hindi" },
        { name: "English Audio -> English Text + Voice", isAudio: true, text: "What is your privacy policy?", lang: "english" },
        { name: "Hindi Text -> Hindi (Devanagari) Text", isAudio: false, text: "नमस्ते, क्या हाल है?", lang: "hindi" },
        { name: "English Text -> English Text", isAudio: false, text: "Hello, how are you?", lang: "english" }
    ];

    for (const test of tests) {
        console.log(`--- TEST: ${test.name} ---`);
        try {
            const result = await generateAutoResponse(
                "917820870519", // From
                "15558903791",  // To
                test.text,
                "test_id_" + Date.now(),
                test.isAudio ? "https://example.com/audio.ogg" : undefined,
                test.isAudio
            );
            console.log("✅ Result:", JSON.stringify(result, null, 2));
        } catch (error) {
            console.error("❌ Error:", error.message);
        }
        console.log("\n");
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
    }
}

runTests();
