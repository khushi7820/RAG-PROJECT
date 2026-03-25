import fs from "fs";
import path from "path";
import os from "os";

/**
 * Text-to-Speech Service
 * Generates audio file from text, uploads it to temporary hosting, and returns the URL.
 */
export async function generateTTS(text: string, lang: "en" | "hi"): Promise<string | null> {
    try {
        console.log(`🎙️ [TTS SERVICE] Generating ${lang} audio for: "${text.substring(0, 30)}..."`);
        
        const ttsLang = lang === "hi" ? "hi-IN" : "en-US";
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${ttsLang}&client=tw-ob`;

        const ttsResponse = await fetch(ttsUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!ttsResponse.ok) throw new Error(`TTS request failed: ${ttsResponse.status}`);

        const buffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        // 📤 Upload to uguu.se (Temporary Hosting - 24h)
        const formData = new FormData();
        const blob = new Blob([buffer], { type: "audio/mpeg" });
        formData.append("files[]", blob, `voice-${Date.now()}.mp3`);

        const uploadRes = await fetch("https://uguu.se/upload.php", {
            method: "POST",
            body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.files?.[0]?.url) {
            throw new Error("Failed to upload audio to temporary hosting");
        }

        const hostedUrl = uploadData.files[0].url;
        console.log("✅ [TTS SERVICE] Audio hosted at:", hostedUrl);
        return hostedUrl;
    } catch (error) {
        console.error("❌ [TTS SERVICE] Error generating/hosting TTS:", error);
        return null;
    }
}
