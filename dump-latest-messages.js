const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function dumpLatest() {
    console.log('Fetching latest 10 messages from whatsapp_messages...');
    const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No messages found in whatsapp_messages table.');
        return;
    }

    data.forEach((m, i) => {
        console.log(`[${i}] ID: ${m.id}`);
        console.log(`    From: ${m.from_number} -> To: ${m.to_number}`);
        console.log(`    Text: ${m.content_text}`);
        console.log(`    Event: ${m.event_type} | Time: ${m.received_at}`);
        console.log(`    Message ID: ${m.message_id}`);
        console.log('-------------------------------------------');
    });
}

dumpLatest();
