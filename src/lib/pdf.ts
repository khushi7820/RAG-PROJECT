import { extractText } from "unpdf";

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
    try {
        const uint8 = new Uint8Array(buffer);
        const result = await extractText(uint8, { mergePages: true });
        
        return result?.text || "";
    } catch (error) {
        console.error("Error in extractPdfText:", error);
        throw new Error(`PDF Parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
