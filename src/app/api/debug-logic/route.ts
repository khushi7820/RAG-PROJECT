import { NextResponse } from "next/server";
import { generateAutoResponse } from "@/lib/autoResponder";

export async function GET() {
  console.log("🔍 DEBUG LOGIC START");
  const results = [];

  const tests = [
    { name: "Hindi Audio", isAudio: true, text: "Mujhe support ke baare me bataiye", lang: "hindi" },
    { name: "Hindi Text", isAudio: false, text: "Mujhe privacy policy chahiye", lang: "hindi" },
    { name: "English Audio", isAudio: true, text: "Tell me about privacy", lang: "english" }
  ];

  for (const test of tests) {
    try {
      const res = await generateAutoResponse(
        "917820870519", 
        "15558903791", 
        test.text, 
        "test_" + Date.now(), 
        test.isAudio ? "https://engees11zamedia.11za.in/prateektosniwalpvt/Receive/AUD/AUD-22104663569274519.ogg" : undefined, 
        test.isAudio
      );
      results.push({ name: test.name, ...res });
    } catch (e) {
      results.push({ name: test.name, error: String(e) });
    }
  }

  return NextResponse.json({ results });
}
