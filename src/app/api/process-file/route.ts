import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf";
import { chunkText } from "@/lib/chunk";
import { embedText } from "@/lib/embeddings";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { Mistral } from '@mistralai/mistralai';

export const runtime = "nodejs";
export const maxDuration = 60; // Max allowed for Vercel Free Tier (previously 300)
export const dynamic = 'force-dynamic';

const mistralApiKey = process.env.MISTRAL_API_KEY;

export async function POST(req: Request) {
    let fileId: string | null = null;

    try {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        const phoneNumber = form.get("phone_number") as string | null;
        const intent = form.get("intent") as string | null;
        const authToken = form.get("auth_token") as string | null;
        const origin = form.get("origin") as string | null;
        const devMode = form.get("dev_mode") === "true";
        const processingMode = form.get("processing_mode") as "ocr" | "transcribe";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!phoneNumber) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        if (!authToken || !origin) {
            return NextResponse.json({
                error: "11za auth_token and origin are required"
            }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const fileName = file.name;
        const fileType = file.type;

        console.log(`[Step 1] Received file: ${fileName} (${fileType}), Phone: ${phoneNumber}`);

        // 0) Validate Environment Variables Early
        if (!mistralApiKey) {
            console.error("MISTRAL_API_KEY is missing from environment");
            return NextResponse.json({ error: "Server Configuration Error: MISTRAL_API_KEY is missing" }, { status: 500 });
        }
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error("Supabase environment variables are missing");
            return NextResponse.json({ error: "Server Configuration Error: Supabase credentials are missing" }, { status: 500 });
        }

        // Determine file type (PDF or Image)
        let extractedText = "";
        let detectedFileType = "pdf";

        if (fileType === "application/pdf") {
            console.log("Processing PDF file:", fileName);
            detectedFileType = "pdf";
            extractedText = await extractPdfText(buffer);
        } else if (fileType.startsWith("image/")) {
            console.log("Processing image file:", fileName);
            detectedFileType = "image";

            const base64Image = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:${fileType};base64,${base64Image}`;

            if (processingMode === "ocr") {
                // Use Mistral OCR API
                const client = new Mistral({ apiKey: mistralApiKey });

                const ocrResponse = await client.ocr.process({
                    model: "mistral-ocr-latest",
                    document: {
                        type: "image_url",
                        imageUrl: dataUrl,
                    },
                    includeImageBase64: true
                });

                const respAny = ocrResponse as any;

                if (typeof respAny.text === "string" && respAny.text.length > 0) {
                    extractedText = respAny.text;
                } else if (Array.isArray(respAny.pages)) {
                    extractedText = respAny.pages
                        .map((p: any) => {
                            if (p.markdown) return p.markdown;
                            if (Array.isArray(p.lines)) return p.lines.map((l: any) => l.text || '').join('\n');
                            if (Array.isArray(p.paragraphs)) return p.paragraphs.map((par: any) => par.text || '').join('\n');
                            return '';
                        })
                        .filter(Boolean)
                        .join('\n\n');
                } else if (Array.isArray(respAny.blocks)) {
                    extractedText = respAny.blocks.map((b: any) => b.text || '').filter(Boolean).join('\n');
                }
            } else {
                const body = JSON.stringify({
                    model: "pixtral-12b-2409",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Extract all text from this image. Provide the text as it appears, maintaining the structure and formatting where possible."
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: dataUrl
                                    }
                                }
                            ]
                        }
                    ]
                });

                const retries = 3;
                let lastResponse: Response | null = null;
                for (let attempt = 0; attempt <= retries; attempt++) {
                    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${mistralApiKey}`,
                            'Content-Length': Buffer.byteLength(body).toString(),
                        },
                        body: body
                    });

                    lastResponse = response;

                    if (response.ok) {
                        const chatResponse = await response.json();
                        extractedText = chatResponse.choices[0].message.content || "";
                        break;
                    }

                    if (response.status === 429 && attempt < retries) {
                        const waitTime = Math.pow(2, attempt) * 1000;
                        console.log(`Vision API Rate limit hit. Retrying in ${waitTime / 1000}s (attempt ${attempt + 1}/${retries})...`);
                        await new Promise((resolve) => setTimeout(resolve, waitTime));
                        continue;
                    }

                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(`Mistral API error: Status ${response.status} - ${errorBody.message || response.statusText}`);
                }

                if (!extractedText && lastResponse && !lastResponse.ok) {
                   // This should have been thrown already, but as a safety
                   const errorBody = await lastResponse.json().catch(() => ({}));
                   throw new Error(`Mistral API error: Status ${lastResponse.status} - ${errorBody.message || lastResponse.statusText}`);
                }
            }
        } else {
            return NextResponse.json({
                error: "Unsupported file type. Please upload a PDF or image file."
            }, { status: 400 });
        }

        console.log(`[Step 2] Text extraction complete. Extracted ${extractedText.length} characters.`);

        // 1) Create file record with 11za credentials and file type
        console.log("[Step 3] Creating file record in rag_files...");
        const { data: fileRow, error: fileError } = await supabaseAdmin
            .from("rag_files")
            .insert({
                name: fileName,
                file_type: detectedFileType,
                auth_token: authToken,
                origin: origin,
            })
            .select()
            .single();

        if (fileError) {
            console.error("Supabase insert file error:", fileError);
            throw fileError;
        }

        fileId = fileRow.id as string;
        console.log(`[Step 3] File record created with ID: ${fileId}`);

        // 2) Split text into chunks
        const chunks = chunkText(extractedText, 1500).filter((c) => c.trim().length > 0);
        console.log(`[Step 4] Chunking complete. Created ${chunks.length} chunks.`);

        if (chunks.length === 0) {
            throw new Error("No text chunks produced from file. The document might be empty or unreadable.");
        }

        // 3) Build embeddings + rows with batch processing
        console.log("[Step 5] Generating embeddings...");
        const rows: {
            file_id: string;
            pdf_name: string;
            chunk: string;
            embedding: number[];
        }[] = [];

        // Process in batches of 20 with a short delay between batches.
        // NOTE: 61s delay was removed — it caused Vercel function timeouts.
        // Mistral allows 60 req/min; batches of 20 with 3s delay = ~400/min
        // which is safe because embedText() already has per-request retry logic.
        const BATCH_SIZE = 20;
        const BATCH_DELAY_MS = 3000; // 3s between batches keeps us well under rate limits

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

            console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)...`);

            // Process batch sequentially to avoid hammering the rate limit
            const embeddings: number[][] = [];
            for (const chunk of batch) {
                const embedding = await embedText(chunk);
                embeddings.push(embedding);
            }

            // Validate and add to rows
            for (let j = 0; j < batch.length; j++) {
                const embedding = embeddings[j];
                if (!embedding || !Array.isArray(embedding)) {
                    throw new Error(`Failed to generate embedding for chunk ${i + j + 1}`);
                }

                rows.push({
                    file_id: fileId,
                    pdf_name: fileName,
                    chunk: batch[j],
                    embedding,
                });
            }

            // Short pause between batches (except for the last batch)
            if (i + BATCH_SIZE < chunks.length) {
                console.log(`Batch ${batchNumber} done. Waiting ${BATCH_DELAY_MS}ms before next batch...`);
                await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
            }
        }

        // 4) Insert all chunks in one go
        console.log(`[Step 6] Inserting ${rows.length} chunks into rag_chunks...`);
        const { error: insertError } = await supabaseAdmin
            .from("rag_chunks")
            .insert(rows);

        if (insertError) {
            console.error("Supabase insert chunks error:", insertError);
            throw insertError;
        }

        // 5) Update phone number mapping
        console.log("[Step 7] Updating phone document mapping...");
        const { data: existingMappings } = await supabaseAdmin
            .from("phone_document_mapping")
            .select("*")
            .eq("phone_number", phoneNumber);

        // Check if there's a mapping without a file_id (created via generate-system-prompt)
        const placeholderMapping = existingMappings?.find(m => m.file_id === null);

        if (placeholderMapping) {
            // Update the existing placeholder mapping with the file_id and credentials
            const { error: mappingError } = await supabaseAdmin
                .from("phone_document_mapping")
                .update({
                    file_id: fileId,
                    intent: intent || placeholderMapping.intent,
                    auth_token: authToken,
                    origin: origin,
                })
                .eq("id", placeholderMapping.id);

            if (mappingError) {
                throw mappingError;
            }
        } else if (existingMappings && existingMappings.length > 0) {
            // Add new file to existing phone number (create additional mapping)
            const { error: mappingError } = await supabaseAdmin
                .from("phone_document_mapping")
                .insert({
                    phone_number: phoneNumber,
                    file_id: fileId,
                    intent: intent || existingMappings[0].intent,
                    system_prompt: existingMappings[0].system_prompt,
                    auth_token: authToken,
                    origin: origin,
                });

            if (mappingError) {
                throw mappingError;
            }
        } else {
            // Create new phone number mapping with intent and credentials
            const { error: mappingError } = await supabaseAdmin
                .from("phone_document_mapping")
                .insert({
                    phone_number: phoneNumber,
                    file_id: fileId,
                    intent: intent || null,
                    auth_token: authToken,
                    origin: origin,
                });

            if (mappingError) {
                throw mappingError;
            }
        }

        return NextResponse.json({
            message: "File processed successfully",
            file_id: fileId,
            file_type: detectedFileType,
            chunks: chunks.length,
            phone_number: phoneNumber,
            ...(devMode && { extractedText, processingMode }),
        });
    } catch (err: any) {
        console.error("PROCESS_FILE_ERROR:", err);

        // Attempt to extract a useful error message from various possible error objects
        let message = "Unknown error during processing";
        
        if (err instanceof Error) {
            message = err.message;
        } else if (typeof err === "string") {
            message = err;
        } else if (err && typeof err === "object") {
            // Handle Supabase/fetch style error objects
            message = err.message || err.error_description || err.error || JSON.stringify(err);
        }

        console.error("PROCESS_FILE_ERROR_MESSAGE:", message);

        // Clean up orphaned file rows when chunk insertion fails
        if (fileId) {
            console.log(`[Cleanup] Deleting orphaned file record: ${fileId}`);
            try {
                await supabaseAdmin.from("rag_files").delete().eq("id", fileId);
            } catch (cleanupErr) {
                console.error("[Cleanup] Failed to delete orphaned file record:", cleanupErr);
            }
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
