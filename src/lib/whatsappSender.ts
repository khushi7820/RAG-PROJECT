/**
 * WhatsApp Message Sender using 11za.in API
 */

const WHATSAPP_API_URL = "https://api.11za.in/apis/sendMessage/sendMessages";

export type SendMessageResult = {
    success: boolean;
    error?: string;
    response?: unknown;
};

/**
 * Send a text message via WhatsApp using 11za.in API
 */
export async function sendWhatsAppMessage(
    phoneNumber: string,
    message: string,
    authToken: string,
    originWebsite: string
): Promise<SendMessageResult> {
    try {
        if (!authToken || !originWebsite) {
            console.error("11za auth token and origin are required");
            return {
                success: false,
                error: "WhatsApp API credentials not provided",
            };
        }

        const payload = {
            sendto: phoneNumber,
            authToken: authToken,
            originWebsite: originWebsite,
            contentType: "text",
            text: message,
        };

        console.log(`📤 [WHATSAPP SENDER] Sending to ${phoneNumber} via ${WHATSAPP_API_URL}`);
    console.log(`📋 Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(`📥 [WHATSAPP SENDER] Response status: ${response.status}`, data);

    if (!response.ok) {
      console.error("❌ [WHATSAPP SENDER] API error:", data);
      return {
        success: false,
        error: `WhatsApp API returned ${response.status}`,
        response: data,
      };
    }

    console.log("✅ [WHATSAPP SENDER] Message sent successfully");

    return {
      success: true,
      response: data,
    };
    } catch (error) {
        console.error("❌ [WHATSAPP SENDER] Exception:", error instanceof Error ? error.message : error);
        if (error instanceof Error) console.error("Stack:", error.stack);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Send a template message via WhatsApp using 11za.in API
 * (For future use if you need template messages)
 */
export async function sendWhatsAppTemplate(
    phoneNumber: string,
    templateData: {
        templateId: string;
        parameters?: Record<string, string>;
    },
    authToken: string,
    originWebsite: string
): Promise<SendMessageResult> {
    try {
        if (!authToken || !originWebsite) {
            return {
                success: false,
                error: "WhatsApp API credentials not provided",
            };
        }

        const payload = {
            sendto: phoneNumber,
            authToken: authToken,
            originWebsite: originWebsite,
            templateId: templateData.templateId,
            parameters: templateData.parameters || {},
        };

        const response = await fetch("https://api.11za.in/apis/template/sendTemplate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("WhatsApp Template API error:", data);
            return {
                success: false,
                error: `WhatsApp API returned ${response.status}`,
                response: data,
            };
        }

        return {
            success: true,
            response: data,
        };
    } catch (error) {
        console.error("Error sending WhatsApp template:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Send a media message (audio, image, etc.) via WhatsApp using 11za.in API
 */
export async function sendWhatsAppMedia(
    phoneNumber: string,
    mediaUrl: string,
    contentType: "audio" | "image" | "file",
    authToken: string,
    originWebsite: string
): Promise<SendMessageResult> {
    try {
        if (!authToken || !originWebsite) {
            return {
                success: false,
                error: "WhatsApp API credentials not provided",
            };
        }

        const payload = {
            sendto: phoneNumber,
            authToken: authToken,
            originWebsite: originWebsite,
            contentType: "media",
            media: {
                url: mediaUrl,
                type: contentType, // e.g., "audio" or "image"
            },
        };

        console.log(`📤 [WHATSAPP SENDER] Sending ${contentType} to ${phoneNumber} via ${WHATSAPP_API_URL}`);
        
        const response = await fetch(WHATSAPP_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ [WHATSAPP SENDER] ${contentType} API error:`, data);
            return {
                success: false,
                error: `WhatsApp API returned ${response.status}`,
                response: data,
            };
        }

        console.log(`✅ [WHATSAPP SENDER] ${contentType} sent successfully`);

        return {
            success: true,
            response: data,
        };
    } catch (error) {
        console.error(`❌ [WHATSAPP SENDER] Exception sending ${contentType}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
