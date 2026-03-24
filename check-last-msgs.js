const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function check() {
    console.log('--- LATEST 5 MESSAGES ---');
    const { data } = await supabase
        .from('whatsapp_messages')
        .select('id, from_number, content_text, event_type, received_at')
        .order('id', { ascending: false })
        .limit(10);
    console.table(data);
}
check();
