import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY;

export async function embedText(text: string, retries = 3): Promise<number[]> {
    if (!apiKey) {
        throw new Error("MISTRAL_API_KEY is not configured");
    }

    const url = "https://api.mistral.ai/v1/embeddings";
    const body = JSON.stringify({
        model: "mistral-embed",
        input: [text],
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Length": Buffer.byteLength(body).toString(),
                },
                body: body,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const statusCode = response.status;
                const message = typeof errorData === 'object' ? JSON.stringify(errorData) : (errorData.message || response.statusText);

                if (statusCode === 429 && attempt < retries) {
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`Rate limit hit. Retrying in ${waitTime / 1000}s (attempt ${attempt + 1}/${retries})...`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                    continue;
                }

                throw new Error(`Mistral API error: Status ${statusCode} - ${message}`);
            }

            const data = await response.json();
            const embedding = data.data?.[0]?.embedding;

            if (!embedding || !Array.isArray(embedding)) {
                throw new Error("Invalid embedding response from API");
            }

            return embedding;
        } catch (error: unknown) {
            if (attempt === retries) {
                throw error;
            }
            // Logic for retry on other errors if needed, or just rethrow
            if (error instanceof Error && error.message.includes("429")) {
                continue; // Already handled above but for safety
            }
            throw error;
        }
    }

    throw new Error("Failed to generate embedding after retries");
}
