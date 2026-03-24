const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function getAudioMessages() {
    const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(5);
    fs.writeFileSync('audio-debug.json', JSON.stringify(data, null, 2), 'utf8');
}
getAudioMessages();
