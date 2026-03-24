const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkConfig() {
    console.log('🔍 Checking 11za configuration...\n');

    // Check phone_document_mapping
    const { data: phones, error: phoneError } = await supabase
        .from('phone_document_mapping')
        .select('*');

    if (phoneError) {
        console.error('❌ Error fetching phone configs:', phoneError);
        return;
    }

    console.log('📱 Phone Document Mapping Table:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    phones.forEach((phone, i) => {
        console.log(`\n${i + 1}. Phone Number: ${phone.phone_number}`);
        console.log(`   Auth Token: ${phone.auth_token ? '✅ SET' : '❌ MISSING'}`);
        console.log(`   Origin: ${phone.origin || '❌ MISSING'}`);
        console.log(`   System Prompt: ${phone.system_prompt ? '✅ SET (' + phone.system_prompt.substring(0, 50) + '...)' : '❌ MISSING'}`);
        console.log(`   File ID: ${phone.file_id || 'NULL'}`);
    });

    // Check recent messages
    console.log('\n\n💬 Recent Messages (last 10):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const { data: messages, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(10);

    if (msgError) {
        console.error('❌ Error fetching messages:', msgError);
    } else if (messages.length === 0) {
        console.log('❌ No messages in database - webhook not receiving messages!');
    } else {
        messages.forEach((msg, i) => {
            console.log(`\n${i + 1}. From: ${msg.from_number} → To: ${msg.to_number}`);
            console.log(`   Text: ${msg.content_text || '(no text)'}`);
            console.log(`   Event: ${msg.event_type}`);
            console.log(`   Time: ${msg.received_at}`);
        });
    }

    console.log('\n\n✅ Configuration Check Complete!');
}

checkConfig().catch(err => console.error('Script error:', err));
