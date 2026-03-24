import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

/**
 * FREE Voice → Text using Groq Whisper
 * NOTE: Groq Whisper does NOT return language field
 */
export async function speechToText(
    audioUrl: string
): Promise<{ text: string; language: string | null } | null> {
    try {
        console.log("⬇️ Downloading audio:", audioUrl);

        const res = await fetch(audioUrl);
        if (!res.ok) throw new Error("Audio download failed");

        const buffer = Buffer.from(await res.arrayBuffer());
        
        // Define tmpdir (Vercel uses /tmp, Local uses project's tmp folder)
        const tmpDir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        const audioPath = path.join(tmpDir, `voice-${Date.now()}.ogg`);
        fs.writeFileSync(audioPath, buffer);

        console.log("🎧 Audio saved:", audioPath);

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-large-v3",
        });

        fs.unlinkSync(audioPath);

        const text = transcription.text?.trim();
        if (!text) return null;

        return {
            text,
            language: null, // ✅ FIX: Groq does not provide language, let autoResponder detect it
        };

    } catch (err) {
        console.error("❌ Groq STT failed:", err);
        return null;
    }
}
