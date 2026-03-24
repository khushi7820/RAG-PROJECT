const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function getConfig() {
    const { data } = await supabase.from('phone_document_mapping').select('phone_number, origin, auth_token').eq('phone_number', '15558903791');
    fs.writeFileSync('config-clean.json', JSON.stringify(data, null, 2), 'utf8');
}
getConfig();
