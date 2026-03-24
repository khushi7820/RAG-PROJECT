const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

async function testWebhook() {
    console.log('🧪 Testing webhook locally...\n');

    const testPayload = {
        messageId: 'test-' + Date.now(),
        from: '917820870519',  // Test user number
        to: '15558903791',     // Your 11za number
        channel: 'whatsapp',
        event: 'MoMessage',
        receivedAt: new Date().toISOString(),
        content: {
            contentType: 'text',
            text: 'Test message'
        },
        whatsapp: {
            senderName: 'Test User'
        }
    };

    console.log('📤 Sending test payload to webhook:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n');

    try {
        const response = await fetch('http://localhost:3000/api/webhook/whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });

        const data = await response.json();
        console.log(`📥 Response status: ${response.status}`);
        console.log('📥 Response body:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Webhook responding correctly!');
            console.log('✨ Check your WhatsApp - you should receive a response soon!');
            console.log('💬 If no response, check the dev console logs for errors.');
        } else {
            console.log('\n❌ Webhook returned error:', data.error);
        }
    } catch (err) {
        console.error('❌ Failed to reach webhook:', err.message);
        console.log('\n⚠️  Make sure:');
        console.log('1. npm run dev is running');
        console.log('2. Server is on http://localhost:3000');
        console.log('3. Try: npm run dev');
    }
}

testWebhook();
