// Node.js 18+ has global fetch
async function testPayload(payload, description) {
    console.log(`\n--- TESTING: ${description} ---`);
    console.log("Payload:", JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch("https://api.11za.in/apis/sendMessage/sendMessages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

async function runTests() {
    const common = {
        sendto: "917820870519",
        authToken: "U2FsdGVkX1/HqmPNoMv87Y/fJHln6aarnlp6dt9NUZwIlWsUthr6qAyequJP6JQ/5OvlmspZAHljts4oCmGJynb52Sqt46m4M/rrIRwyP4IDwH3YqxlzemsjSfG2Xu+bZ4O6ajPX2GBl0mmBpxLv2OAUATgf0sk8RNp7ullBwEGw7ALWS2oIiBYw58L7DCOa",
        originWebsite: "https://prateektosniwal.com/"
    };

    const fields = ["mediaUrl", "FileUrl", "fileUrl", "media", "file", "url", "media_url", "file_url"];
    
    for (const field of fields) {
        await testPayload({
            ...common,
            contentType: "audio",
            [field]: "https://o.uguu.se/EecoSLwB.mp3"
        }, `Flat ${field} with audio contentType`);
    }

    // Try contentType: "file" with these fields
    for (const field of fields) {
        await testPayload({
            ...common,
            contentType: "file",
            [field]: "https://o.uguu.se/EecoSLwB.mp3"
        }, `Flat ${field} with file contentType`);
    }

    // Variation: lowercase SendTo
    await testPayload({
        ...common,
        sendto: "917820870519",
        contentType: "audio",
        mediaUrl: "https://o.uguu.se/EecoSLwB.mp3"
    }, "Flat mediaUrl with audio contentType and lowercase sendto");
}

runTests();
